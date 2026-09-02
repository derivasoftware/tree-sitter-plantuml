/**
 * External scanner: the frontier fallback (REQ-00012-2).
 *
 * An identifier-headed statement the grammar cannot parse must become
 * a raw_line, never an ERROR. Pure grammar rules cannot express "try
 * structural, else swallow the line": tree-sitter's lexer picks one
 * token per state, and at statement start the identifier always wins.
 * So the discrimination lives here: claim the line as _raw_statement
 * ONLY when its head is an identifier that is not a statement keyword
 * and what follows the head cannot open any structural construct.
 * When in doubt, return false — the internal lexer proceeds and the
 * structural rules keep their exact behaviour.
 *
 * The keyword table mirrors every word that can head a statement in
 * grammar.js. Drift is caught loudly: a keyword added there but not
 * here turns its construct into a raw_line and fails its corpus test.
 */

#include <string.h>
#include <wctype.h>

#include "tree_sitter/parser.h"

enum TokenType {
  RAW_STATEMENT,
  TEMPLATE_METHOD_NAME,
  PLAIN_RETURN_TYPE,
  ERROR_SENTINEL,
};

static const char *const KEYWORDS[] = {
  /* declarations */
  "class", "abstract", "interface", "enum",
  "annotation", "exception", "metaclass", "protocol",
  "struct", "record", "dataclass",
  /* participants */
  "participant", "actor", "boundary", "control", "entity",
  "database", "collections", "queue",
  /* grouping */
  "package", "namespace", "together",
  /* frames */
  "alt", "opt", "loop", "par", "break", "critical", "group",
  "else", "end",
  /* notes and display */
  "note", "hide", "show", "remove", "restore",
  /* keyword frontier (route 2) and raw blocks */
  "title", "skinparam", "scale", "caption", "autonumber", "set",
  "left", "allowmixing", "allow_mixing",
  "usecase", "component", "state", "object", "folder", "frame",
  "cloud", "node", "rectangle", "artifact", "agent",
  "card", "file", "stack",
  "circle", "diamond", "page", "json", "top", "bottom",
  "activate", "deactivate", "return", "ref",
  "create", "destroy", "autoactivate", "box",
  "legend", "header", "footer",
};

static bool is_word(int32_t c) { return c == '_' || iswalnum(c); }

static void eat_line(TSLexer *lexer) {
  while (lexer->lookahead != 0 && lexer->lookahead != '\n') {
    lexer->advance(lexer, false);
  }
}

/* C++-direction member signatures (issues #5 and #7, REQ-00028-4): two
   lexical decisions inside class bodies that need lookahead. At member
   start, `get<T>(` is a method name followed by template parameters,
   yet the internal lexer's longest match reads `get<T>` as a templated
   return type; and `T get<T>(` / `void execute(` carry a plain
   identifier return type that, without the parameter paren pinned to
   the name behind it, would be prose and must stay an attribute. Both
   tokens end at the first identifier — the grammar's generics token
   takes the clause — and both return false unless the whole shape
   `ident [ws ident] [<…>] (` is on the line, so every other member
   keeps its exact lexing. */

static bool scan_identifier(TSLexer *lexer, char *head, size_t cap) {
  if (!(lexer->lookahead == '_' || iswalpha(lexer->lookahead))) return false;
  size_t len = 0;
  while (is_word(lexer->lookahead)) {
    if (head != NULL && len < cap - 1) head[len++] = (char)lexer->lookahead;
    lexer->advance(lexer, false);
  }
  if (head != NULL) head[len] = 0;
  return true;
}

/* Mirrors the generics token: `<`, no nested bracket, `>`; then the
   opening parenthesis that makes it a method's template clause. */
static bool template_clause_then_paren(TSLexer *lexer) {
  if (lexer->lookahead != '<') return false;
  lexer->advance(lexer, false);
  /* `name<>(` is not a template clause: the grammar's generics token
     needs at least one character, so claiming the name here would leave
     the parser with nothing to match and an ERROR — the line keeps the
     attribute path 0.9.3 gave it (frontier, REQ-00028-4). */
  if (lexer->lookahead == '>') return false;
  while (lexer->lookahead != '>') {
    if (lexer->lookahead == '<' || lexer->lookahead == '\n' ||
        lexer->lookahead == 0) {
      return false;
    }
    lexer->advance(lexer, false);
  }
  lexer->advance(lexer, false);
  return lexer->lookahead == '(';
}

/* What separates a method from an attribute is the position of the
   parameter paren, not the return type (issue #7): a method pins `(`
   to its name — directly (`execute(`) or behind a template clause
   (`get<T>(`) — while an attribute's parens live inside its type,
   right of the colon (`x : std::function<void(int)>`). */
static bool method_clause_after_name(TSLexer *lexer) {
  if (lexer->lookahead == '(') return true;
  return template_clause_then_paren(lexer);
}

static bool scan_template_member(TSLexer *lexer, const bool *valid_symbols) {
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, true);
  }
  char head[16];
  if (!scan_identifier(lexer, head, sizeof head)) return false;
  lexer->mark_end(lexer);
  if (lexer->lookahead == '<') {
    if (!valid_symbols[TEMPLATE_METHOD_NAME]) return false;
    if (!template_clause_then_paren(lexer)) return false;
    lexer->result_symbol = TEMPLATE_METHOD_NAME;
    return true;
  }
  if (lexer->lookahead != ' ' && lexer->lookahead != '\t') return false;
  if (!valid_symbols[PLAIN_RETURN_TYPE]) return false;
  /* `operator` never heads a plain return type: `operator bool()` and
     `operator new(...)` are operator-overload names owned by
     cpp_method_name. The head buffer out-lengths the word, so a
     truncated longer identifier can never compare equal. */
  if (strcmp(head, "operator") == 0) return false;
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, false);
  }
  if (!scan_identifier(lexer, NULL, 0)) return false;
  if (!method_clause_after_name(lexer)) return false;
  lexer->result_symbol = PLAIN_RETURN_TYPE;
  return true;
}

static bool claim(TSLexer *lexer) {
  eat_line(lexer);
  lexer->result_symbol = RAW_STATEMENT;
  lexer->mark_end(lexer);
  return true;
}

bool tree_sitter_plantuml_external_scanner_scan(
    void *payload, TSLexer *lexer, const bool *valid_symbols) {
  /* During error recovery every symbol is marked valid, the sentinel
     included — never invent tokens there. */
  if (valid_symbols[ERROR_SENTINEL]) return false;
  /* Member states never carry _raw_statement, so the template scan can
     own them outright; a false here resets the lexer for the internal
     rules. */
  if (valid_symbols[TEMPLATE_METHOD_NAME] || valid_symbols[PLAIN_RETURN_TYPE]) {
    return scan_template_member(lexer, valid_symbols);
  }
  if (!valid_symbols[RAW_STATEMENT]) return false;

  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, true);
  }
  int32_t c = lexer->lookahead;
  if (!(c == '_' || c == '$' || iswalpha(c))) return false;

  /* Head identifier, mirroring the grammar: \$?word([.-]word)* */
  char head[24];
  size_t len = 0;
  bool compound = false;
  if (c == '$') { lexer->advance(lexer, false); compound = true; }
  while (is_word(lexer->lookahead)) {
    if (len < sizeof(head) - 1) head[len++] = (char)lexer->lookahead;
    else compound = true; /* longer than any keyword */
    lexer->advance(lexer, false);
  }
  head[len] = 0;
  for (;;) {
    if (lexer->lookahead == '.' || lexer->lookahead == '-') {
      int32_t sep = lexer->lookahead;
      lexer->advance(lexer, false);
      if (is_word(lexer->lookahead)) {
        compound = true;
        while (is_word(lexer->lookahead)) lexer->advance(lexer, false);
      } else {
        /* "a-" / "a." followed by non-word: an operator begins. */
        (void)sep;
        return false;
      }
    } else {
      break;
    }
  }
  if (!compound) {
    /* Activity `group Label {` is a raw braced block head; the
       braceless sequence `group` frame keeps its structure. Peek the
       rest of the line before the keyword table gets a say. */
    if (strcmp(head, "group") == 0) {
      bool brace = false;
      while (lexer->lookahead != 0 && lexer->lookahead != '\n') {
        if (lexer->lookahead == '{') brace = true;
        lexer->advance(lexer, false);
      }
      if (brace) {
        lexer->result_symbol = RAW_STATEMENT;
        lexer->mark_end(lexer);
        return true;
      }
      return false;
    }
    for (size_t i = 0; i < sizeof(KEYWORDS) / sizeof(KEYWORDS[0]); i++) {
      if (strcmp(head, KEYWORDS[i]) == 0) return false;
    }
  }

  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, false);
  }
  c = lexer->lookahead;

  /* A colon opens colon_member (and :: the member_ref route). */
  if (c == ':') return false;

  /* A qualifier bracket may precede a cardinality; a cardinality may
     precede the operator. Walk past both before requiring one —
     consumed characters belong to the raw line if we end up claiming,
     and are discarded if we return false. */
  if (c == '[') {
    lexer->advance(lexer, false);
    while (lexer->lookahead != ']' && lexer->lookahead != '\n' &&
           lexer->lookahead != 0) {
      lexer->advance(lexer, false);
    }
    if (lexer->lookahead != ']') return claim(lexer); /* unterminated */
    lexer->advance(lexer, false);
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
      lexer->advance(lexer, false);
    }
    c = lexer->lookahead;
  }
  if (c == '"') {
    lexer->advance(lexer, false);
    while (lexer->lookahead != '"' && lexer->lookahead != '\n' &&
           lexer->lookahead != 0) {
      lexer->advance(lexer, false);
    }
    if (lexer->lookahead != '"') return claim(lexer); /* unterminated */
    lexer->advance(lexer, false);
    if (lexer->lookahead == '/') { /* "card"/role */
      lexer->advance(lexer, false);
      while (is_word(lexer->lookahead) || lexer->lookahead == '.' ||
             lexer->lookahead == '-') {
        lexer->advance(lexer, false);
      }
    }
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
      lexer->advance(lexer, false);
    }
    c = lexer->lookahead;
  }

  /* Only a relation operator can continue the statement now. */
  if (c == '-' || c == '.') return false;
  if (c == '<' || c == '*' || c == '+' || c == 'o' || c == 'x') {
    lexer->advance(lexer, false);
    int32_t d = lexer->lookahead;
    if (d == '-' || d == '.') return false;
    if (c == '<' && d == '|') return false;
    return claim(lexer);
  }
  if (c == '(') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == ')') return false; /* lollipop ()-- */
    return claim(lexer);
  }
  /* Anything else — a word, digit, #, =, end of line — is unparseable
     as a statement continuation: the whole line is raw. */
  return claim(lexer);
}

void *tree_sitter_plantuml_external_scanner_create(void) { return NULL; }
void tree_sitter_plantuml_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_plantuml_external_scanner_serialize(
    void *payload, char *buffer) { return 0; }
void tree_sitter_plantuml_external_scanner_deserialize(
    void *payload, const char *buffer, unsigned length) {}
