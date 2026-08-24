; Indentation (nvim-treesitter capture vocabulary): bodies and frames
; open one level; closers and else lines align with their opener —
; mirroring plantuml-fmt's canonical style (two spaces per block).

[
  (entity_body)
  (package_block)
  (namespace_block)
  (together_block)
  (frame_block)
] @indent.begin

[
  "}"
  "end"
] @indent.branch

(else_clause "else" @indent.branch)

[
  (raw_line)
  (comment)
] @indent.auto
