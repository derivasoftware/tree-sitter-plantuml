; Foldable regions: entity bodies, grouping blocks, sequence frames and
; multi-line diagrams. Editors with native tree-sitter folding (Neovim,
; Helix, Zed) consume this directly.

(entity_body) @fold
(package_block) @fold
(namespace_block) @fold
(together_block) @fold
(frame_block) @fold
(if_block) @fold
(while_block) @fold
(repeat_block) @fold
(switch_block) @fold
(fork_block) @fold
(split_block) @fold
(partition_block) @fold
(box_block) @fold
(reference) @fold
(raw_block) @fold
(note_statement) @fold
(participant_declaration) @fold
(diagram) @fold
