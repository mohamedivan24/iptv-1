const helper = require('./helper')
const countries = require('./country')

const ROOT_DIR = './channels'
const INDEX_DIR = './index'

let list = {
  all: [],
  countries: {},
  languages: {},
  categories: {}
}

function main() {
  console.log(`Parsing index...`)
  parseIndex()
  console.log('Creating root directory...')
  createRootDirectory()
  console.log('Creating .nojekyll...')
  createNoJekyllFile()
  console.log('Generating index.m3u...')
  generateIndex()
  console.log('Generating channels.json...')
  generateChannels()
  console.log('Generating index.country.m3u...')
  generateCountryIndex()
  console.log('Generating index.language.m3u...')
  generateLanguageIndex()
  console.log('Generating index.category.m3u...')
  generateCategoryIndex()
  console.log('Generating /countries...')
  generateCountries()
  console.log('Generating /categories...')
  generateCategories()
  console.log('Generating /languages...')
  generateLanguages()
  console.log('Done.\n')

  console.log(
    `Countries: ${Object.values(list.countries).length}. Languages: ${
      Object.values(list.languages).length
    }. Categories: ${Object.values(list.categories).length}. Channels: ${list.all.length}.`
  )
}

function createRootDirectory() {
  helper.createDir(ROOT_DIR)
  helper.createDir(INDEX_DIR)
}

function createNoJekyllFile() {
  helper.createFile(`${ROOT_DIR}/.nojekyll`)
}

function parseIndex() {
  const root = helper.parsePlaylist(`${INDEX_DIR}/index.m3u`)

  let countries = {}
  let languages = {}
  let categories = {}

  for (let rootItem of root.items) {
    const playlist = helper.parsePlaylist(rootItem.url)
    const countryCode = helper.getBasename(rootItem.url).toLowerCase()
    const countryName = rootItem.name

    for (let item of playlist.items) {
      const channel = helper.createChannel(item)
      channel.country.code = countryCode
      channel.country.name = countryName
      channel.tvg.url = playlist.header.attrs['x-tvg-url'] || ''

      // all
      list.all.push(channel)

      // country
      if (!countries[countryCode]) {
        countries[countryCode] = []
      }
      countries[countryCode].push(channel)

      // language
      if (!channel.language.length) {
        const languageCode = 'undefined'
        if (!languages[languageCode]) {
          languages[languageCode] = []
        }
        languages[languageCode].push(channel)
      } else {
        for (let language of channel.language) {
          const languageCode = language.code || 'undefined'
          if (!languages[languageCode]) {
            languages[languageCode] = []
          }
          languages[languageCode].push(channel)
        }
      }

      // category
      const categoryCode = channel.category ? channel.category.toLowerCase() : 'other'
      if (!categories[categoryCode]) {
        categories[categoryCode] = []
      }
      categories[categoryCode].push(channel)
    }
  }

  list.countries = countries
  list.languages = languages
  list.categories = categories
}

function generateIndex() {
  const filename = `${ROOT_DIR}/index.m3u`
  helper.createFile(filename, '#EXTM3U\n')

  const channels = helper.sortBy(list.all, ['name', 'url'])
  for (let channel of channels) {
    helper.appendToFile(filename, channel.toString())
  }
}

function generateChannels() {
  const filename = `${ROOT_DIR}/channels.json`
  const sorted = helper.sortBy(list.all, ['name', 'url'])
  const channels = sorted.map(c => c.toJSON())
  helper.createFile(filename, JSON.stringify(channels))
}

function generateCountryIndex() {
  const filename = `${ROOT_DIR}/index.country.m3u`
  helper.createFile(filename, '#EXTM3U\n')

  const channels = helper.sortBy(list.all, ['country.name', 'name', 'url'])
  for (let channel of channels) {
    const category = channel.category
    channel.category = channel.country.name
    helper.appendToFile(filename, channel.toString())
    channel.category = category
  }
}

function generateLanguageIndex() {
  const filename = `${ROOT_DIR}/index.language.m3u`
  helper.createFile(filename, '#EXTM3U\n')

  const channels = helper.sortBy(list.all, ['language.name', 'name', 'url'])
  for (let channel of channels) {
    const category = channel.category
    channel.category = channel.language.map(l => l.name).join(';')
    helper.appendToFile(filename, channel.toString())
    channel.category = category
  }
}

function generateCategoryIndex() {
  const filename = `${ROOT_DIR}/index.category.m3u`
  helper.createFile(filename, '#EXTM3U\n')

  const channels = helper.sortBy(list.all, ['category', 'name', 'url'])
  for (let channel of channels) {
    helper.appendToFile(filename, channel.toString())
  }
}

function generateCountries() {
  const outputDir = `${ROOT_DIR}/countries`
  helper.createDir(outputDir)

  const indexFile = `${INDEX_DIR}/country.m3u`
  helper.createFile(indexFile, '#EXTM3U\n')

  for (let cid in list.countries) {
    let country = list.countries[cid]
    const filename = `${outputDir}/${cid}.m3u`
    helper.createFile(filename, '#EXTM3U\n')

    // Generating country index file
    helper.appendToFile(indexFile, "#EXTINF:-1," + countries.getCountryInfo(cid).name + "\n")
    helper.appendToFile(indexFile, filename.replace('./', "") + "\n")
  }
}

function generateCategories() {
    const outputDir = `${ROOT_DIR}/categories`
    helper.createDir(outputDir)

    let indexData = []
    const indexFile = `${INDEX_DIR}/category.m3u`
    helper.createFile(indexFile, '#EXTM3U\n')

    for (let cid in list.categories) {
      let category = list.categories[cid]
      const filename = `${outputDir}/${cid}.m3u`
      helper.createFile(filename, '#EXTM3U\n')

      indexData.push({
        'category': helper.capitalize(cid),
        'data': "#EXTINF:-1," + helper.capitalize(cid) + "\n"
                    + filename.replace('./', "") + "\n"
      })

      const channels = helper.sortBy(Object.values(category), ['name', 'url'])
      for (let channel of channels) {
        helper.appendToFile(filename, channel.toString())
      }
    }

    // Generating category index file
    const sortedData = helper.sortBy(Object.values(indexData), ['category'])
    for(let cid in sortedData) {
      helper.appendToFile(indexFile, sortedData[cid].data.toString())
    }
}

function generateLanguages() {
    const outputDir = `${ROOT_DIR}/languages`
    helper.createDir(outputDir)

    let indexData = []
    const indexFile = `${INDEX_DIR}/language.m3u`
    helper.createFile(indexFile, '#EXTM3U\n')

    for (let lid in list.languages) {
      let language = list.languages[lid]
      const filename = `${outputDir}/${lid}.m3u`
      helper.createFile(filename, '#EXTM3U\n')

      indexData.push({
        'lang': lid,
        'data': `"#EXTINF:-1,${countries.getCountryLangAlpha3(lid)}\n${filename.replace('./', "")}\n`
      })

      const channels = helper.sortBy(Object.values(language), ['name', 'url'])
      for (let channel of channels) {
        helper.appendToFile(filename, channel.toString())
      }
    }

    // Generating category index file
    const sortedData = helper.sortBy(Object.values(indexData), ['lang'])
    for (let lid in sortedData) {
      helper.appendToFile(indexFile, sortedData[lid].data.toString())
    }
}

main()