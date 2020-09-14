import 'alpinejs'
import '@leanix/reporting'
import moment from 'moment'
import Chart from 'chart.js'
import pdfMake from 'pdfmake/build/pdfmake'
import './assets/tailwind.css'

const  state = {
  reportSetup: {},
  itComponents: [],
  obsoleteITComponents: [],
  columns: [
    { key: 'obsolescenceDate', label: 'Obsolescence Date' },
    { key: 'category', label: 'Category' },
    { key: 'name', label: 'IT Component' }
  ],
  pdfDocGenerator: undefined,
  dataUrl: undefined,
  isLoading: 0,
  startDate: moment().format('YYYY-MM-DD'),
  endDate: moment().add(1, 'months').endOf('month').format('YYYY-MM-DD'),
  analysis: ''
}

const methods = {
  async initializeReport () {
    this.reportSetup = await lx.init()
    await lx.ready({})
  },
  async fetchDataset () {
    const query = `
    {
      allFactSheets(factSheetType: ITComponent) {
        edges {
          node {
            id
            name
            ... on ITComponent {
              category
              lifecycle {
                lifecyclePhase:asString
                phases {
                  phase
                  startDate
                }
              }
            }
          }
        }
      }
    }
    `
    try {
      this.isLoading++
      this.itComponents = await lx.executeGraphQL(query)
        .then(data => data.allFactSheets.edges.map(({ node }) => node))
    } finally {
      this.isLoading--
    }
  },
  computeObsolescencies () {
    let { startDate, endDate, itComponents, reportSetup } = this
    const { settings } = reportSetup
    const { viewModel } = settings
    const { factSheets } = viewModel
    const itComponentViewModel = factSheets.find(({ type }) => type === 'ITComponent')
    const { fieldMetaData } = itComponentViewModel
    const { category } = fieldMetaData
    const { values: categoryFieldMetaDataIndex } = category

    startDate = moment(startDate, 'YYYY-MM-DD')
    endDate = moment(endDate, 'YYYY-MM-DD')
    const obsoleteITComponents = itComponents
      .reduce((accumulator, itComponent) => {
        let { lifecycle, category } = itComponent
        if (lifecycle === null) return accumulator
        const { phases } = lifecycle
        let { startDate: obsolescenceDate } = phases.find(({ phase }) => phase === 'endOfLife') || {}
        if (!obsolescenceDate) return accumulator
        obsolescenceDate = moment(obsolescenceDate, 'YYYY-MM-DD')
        if (obsolescenceDate && obsolescenceDate.isBetween(startDate, endDate)) {
          const label = category === null
            ? 'Not defined'
            : lx.translateFieldValue('ITComponent', 'category', category)
          const { bgColor, color } = categoryFieldMetaDataIndex[category] || {}
          category = { key: category, label, bgColor, color }
          accumulator.push({ ...itComponent, category, obsolescenceDate })
        }
        return accumulator
      }, [])
      .sort(({ obsolescenceDate: A }, { obsolescenceDate: B }) => A.unix() < B.unix() ? -1 : A.unix() > B.unix() ? 1 : 0)
      .map(itComponent => ({
        ...itComponent,
        obsolescenceDate: itComponent.obsolescenceDate.format('YYYY-MM-DD')
      }))

    this.obsoleteITComponents = obsoleteITComponents
    this.generateBarChart ()
  },
  generateBarChart () {
    const categoryIndex = this.obsoleteITComponents
      .reduce((accumulator, itComponent) => {
        const { category } = itComponent
        if (!accumulator[category.key]) accumulator[category.key] = { ...category, items: [] }
        accumulator[category.key].items.push(itComponent)
        return accumulator
      }, {})

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: 2,
      events: [],
      legend: false,
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
              stepSize: 1
            }
          }
        ]
      }
    }
    const keys = Object.keys(categoryIndex)

    const data = {
      labels: keys.map(key => categoryIndex[key].label),
      datasets: [
        {
          backgroundColor: keys.map(key => categoryIndex[key].bgColor),
          data: keys.map(key => categoryIndex[key].items.length)
        }
      ]
    }

    new Chart(this.$refs.barChart, { type: 'bar', data, options })
  },
  generatePDF () {
    const dd = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: 1 * 72, // 2.54 cm - 1 in converted to points, pageMargins is specified in points...
      content: [
        {
          style: 'titleBlock',
          stack: [
            { text: 'Obsolescence Report', style: 'header' },
            {
              fontSize: 10,
              margin: [0, 15],
              italics: true,
              text: [
                { text: this.startDate, bold: true },
                ' to ',
                { text: this.endDate, bold: true }
              ]
            }
          ]
        },
        {
          style: 'section',
          stack: [
            {
              text: 'Obsolescences per IT Component Category',
              style: 'subheader'
            },
            this.obsoleteITComponents.length
              ? { image: 'barChart', fit: [420, 200] }
              : { text: 'No obsolete it components during this period...', italics: true, alignment: 'center' }
          ]
        },

        {
          style: 'section',
          stack: [
            {
              text: `IT Component Obsolescences`,
              style: 'subheader'
            },
            !this.obsoleteITComponents.length
              ? { text: 'No obsolete it components during this period...', italics: true, alignment: 'center' }
              : {
                  table: {
                    widths: ['auto', 'auto', '*'],
                    headerRows: 1,
                    body: [
                      this.columns.map(({ label }) => label),
                      ...this.obsoleteITComponents
                        .reduce((accumulator, itComponent) => {
                          const row = this.columns.map(({ key }) => itComponent[key].label || itComponent[key])
                          accumulator.push(row)
                          return accumulator
                        }, [])
                    ]
                }
            }
          ]
        },
        {
          style: 'section',
          stack: [
            {
              text: 'Analysis',
              style: 'subheader'
            },
            this.analysis
              ? { text: this.analysis, alignment: 'justify '}
              : { text: 'no comments', alignment: 'center', italics: 'true' }
          ]
        }
      ],
      images: {
        barChart: this.$refs.barChart.toDataURL()
      },
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: {
        titleBlock: { alignment: 'center', margin: [0, 0, 0, 40] },
        header: { fontSize: 18, bold: true, alignment: 'center' },
        subheader: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
        section: { margin: [0, 0, 0, 50] }
      }
    }

    const fonts = {
      Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
      }
    }
    const pdfDocGenerator = pdfMake.createPdf(dd, undefined, fonts, vfsFonts)
    pdfDocGenerator.getDataUrl(dataUrl => { this.dataUrl = dataUrl })
  }
}

window.initializeContext = () => {
  return {
    ...state,
    ...methods
  }
}