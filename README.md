This is Booklet creator for PDF.
I like to print books and since in macOS you no longer can create booklets from pdf while printing I decided to make my own :)

Print the result 2 pages per sheet on A4, short-edge flip. Two layouts:

- **Cut & stack** (default) — for books that get guillotined and glued/comb-bound. The whole
  PDF is one stack: every sheet has a page from the first half on the left and the matching
  page of the second half on the right. Cut the printed stack in half and put the pile with
  page 1 on top of the other pile — the book is in order, nothing to rearrange. The count is
  sheets per print batch (fronts of the batch, then its backs, for manual duplex); 1 = a
  duplex printer. Make the page count a multiple of 4, or blanks are added at the very end.
- **Fold** — saddle-stitch signatures: 4 pages (2 front and 2 back) per sheet, the count is
  sheets per signature (5 sheets = 20 pages). Fold each signature and stack them.
