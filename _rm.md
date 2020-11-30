Where to get logs:

- https://datasetsearch.research.google.com/search?query=HTTP%20server%20logs&docid=e82RkTuD5g%2BSYjjjAAAAAA%3D%3D

- https://www.google.com/search?biw=1280&bih=665&ei=AkK8X_mtJ8qZsAezo6bADA&q=inurl%3Aaccess.log+filetype%3Alog&oq=inurl%3Aaccess.log+filetype%3Alog&gs_lcp=CgZwc3ktYWIQA1AAWABgsNMGaAdwAHgAgAEpiAFQkgEBMpgBAKoBB2d3cy13aXrAAQE&sclient=psy-ab&ved=0ahUKEwj5tvOx5ZntAhXKDOwKHbORCcg4ChDh1QMIDQ&uact=5

- https://www.sec.gov/dera/data/edgar-log-file-data-set.html

- http://www.drukkerij-bultinck.be/logs///drukkerij-bultinck.be-access.log

- http://mail.euroinsol.eu/logs/access.log (access.log)

- https://github.com/linuxacademy/content-elastic-log-samples (access2.log)


Improvements:

- https://medium.com/@thomaspoignant/algorithmic-design-a-hit-counter-4bc6400152a

- Use Redis hash with expire --> no need to manually remove old entries
- Count-Min data structure
- binary search (maybe no)
- distributed counter
- locking counter to prevent race condition
- cache to avoid recalculation
- estimate least time to wait until average returns to normal instead of checking every second