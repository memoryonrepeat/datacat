const assert = require('assert')
const DataCat = require('../class/DataCat')

const sleep = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`I was sleeping ${timeout} ms`)
      resolve()
    }, timeout)
  })
}

describe('DataCat', () => {
  describe('#alerting()', () => {
    const dataCat = new DataCat('test.log', 5, 5)

    it('should be able to trigger alert', async () => {
      const currentTime = dataCat._getTimestamp()

      for (let i = 0; i < (dataCat.threshold + 1) * dataCat.TOTAL_HITS_INTERVAL + 200; i++) {
        dataCat.updateTotalHits(currentTime)
      }

      // should turn on alert and turn off 2 mins later
      assert.equal(dataCat.isOnAlert, true)

      await sleep(7000)

      assert.equal(dataCat.isOnAlert, false)
    }).timeout(8000)
  })
})
