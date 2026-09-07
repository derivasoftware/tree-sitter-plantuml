; Indentation (nvim-treesitter capture vocabulary): bodies and frames
; open one level; closers and else lines align with their opener —
; mirroring plantuml-fmt's canonical style (two spaces per block).

[
  (entity_body)
  (package_block)
  (namespace_block)
  (together_block)
  (frame_block)
  (if_block)
  (while_block)
  (repeat_block)
  (switch_block)
  (fork_block)
  (split_block)
  (partition_block)
  (box_block)
] @indent.begin

[
  "}"
  "end"
  "endif"
  "endwhile"
  "endswitch"
  "end box"
] @indent.branch

(else_clause "else" @indent.branch)
(elseif_clause "elseif" @indent.branch)
(case_clause "case" @indent.branch)
(fork_again "fork" @indent.branch)
(split_again "split" @indent.branch)
(repeat_block "repeat" @indent.branch)

[
  (raw_line)
  (comment)
] @indent.auto
