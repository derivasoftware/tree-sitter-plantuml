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

enum TokenType { RAW_STATEMENT, ERROR_SENTINEL };

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
