# Sample task bundle — Pangolin conservation sentiment

A ready-to-upload demo bundle for reviewers to try the codebook-development flow.
It's a small, curated subset of a public wildlife-trafficking social-media dataset:
short, readable, English pangolin posts spanning three conservation-sentiment
labels (`positive`, `negative`, `neutral`).

## Files

| File | Rows | Columns | Use in the upload form |
|------|------|---------|------------------------|
| `d_all.csv` | 300 (unlabeled) | `translated_text` | **Unlabeled dataset** — the pool samples are drawn from |
| `d_val.csv` | 100 (labeled) | `translated_text`, `Final Label` | **Labeled dataset** — held-out validation set for evaluation |
| `labels.json` | 3 labels | — | **Label set** |
| `task.json` | — | — | **Task details** |

`d_val` is balanced (~33 per label). `d_all` is unlabeled (the final-inference step
labels it). There is no overlap between the two files.

`pangolin_sample_bundle.zip` bundles the four data files together — this is the same
archive offered by the "Download sample dataset" button on the Create Codebook page.

## How to use

On the "Create Codebook" upload page, keep the defaults:

- **Text column** = `translated_text`
- **Label column** = `Final Label`
- **Budget** = whatever you want to review (default comes from the deployment)

Upload the four files into their matching slots, create the task, then work through
the AI-annotation review to build and export a codebook.
