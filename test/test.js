const assert = require('assert')
const DataCat = require('../class/DataCat')

const sleep = (timeout) => {
  console.log(`Going to sleep for ${timeout} milliseconds`)
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Woken up from sleep')
      resolve()
    }, timeout)
  })
}

describe('DataCat', () => {
  describe('#alerting()', () => {
    // Alert will trigger if there is more than 5 requests per second
    const threshold = 5

    // Length of window to measure. Default is 2 mins. Using shorter window for test.
    const interval = 7

    const dataCat = new DataCat('test.log', threshold, interval)

    it('should correctly adjust alert state', async () => {
      // Initially there should be no alert
      assert.equal(dataCat.isOnAlert, false)

      for (let i = 0; i < (dataCat.threshold - 2) * dataCat.TOTAL_HITS_INTERVAL; i++) {
        dataCat.updateTotalHits(dataCat._getTimestamp())
      }

      // At this point there should still be no alert since average hits = (threshold - 2)
      assert.equal(dataCat.isOnAlert, false)

      for (let i = 0; i < (dataCat.threshold + 2) * dataCat.TOTAL_HITS_INTERVAL; i++) {
        dataCat.updateTotalHits(dataCat._getTimestamp())
      }

      // Now there should be some alert since average hits
      // is around (threshold - 2) + (threshold + 2) = 2*threshold
      // The number might be a bit smaller in reality as the window might have
      // already moved some miliseconds between two loops but still it should
      // be enough to trigger the alert
      assert.equal(dataCat.isOnAlert, true)

      await sleep((interval + 2) * 1000)

      // should turn off alert after interval has passed
      assert.equal(dataCat.isOnAlert, false)
    }).timeout((interval + 3) * 1000)
  })
})
