const DataCat = require('./class/DataCat')

const dataCat = new DataCat('./logs/simple.log', 5, 5)

dataCat.consumeLogs()
