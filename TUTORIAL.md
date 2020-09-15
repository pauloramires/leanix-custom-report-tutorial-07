# Creating and exporting a custom PDF document from workspace data
Custom reports are a great way of creating specific views of your LeanIX workspace data. However, in a corporate environment, the user may need to document and communicate those views, analyses, and findings to other stakeholders in a format that follows a certain set of corporate documentation guidelines and policies. Thus, the ability to export information from LeanIX into a popular document format such as PDF, for example, that follows a certain template that meets the corporate guidelines, may save some time to the user.
In this step-by-step tutorial, we'll create a [LeanIX](https://www.leanix.net/en/) custom report project that demonstrates how to export its content into a PDF document that follows a pre-defined template. More specifically, we'll generate an obsolescence report in which the user sets a start and end date for the analysis, and gets both a chart and a list of all IT Components in his workspace that transition into the "End of Life" lifecycle phase during the specified date range.

![](https://i.imgur.com/eZtC7GW.png)


The complete source-code for this project can be found [here](https://github.com/pauloramires/leanix-custom-report-tutorial-07).

## Pre-requisites

*  [NodeJS LTS](https://nodejs.org/en/) installed in your computer.

## Getting started

Install the [leanix-reporting-cli](https://github.com/leanix/leanix-reporting-cli) globally via npm:

```bash
npm install -g @leanix/reporting-cli
```

Initialize a new project:

```bash
mkdir leanix-custom-report-tutorial-07
cd leanix-custom-report-tutorial-07
lxr init
npm install
```
Configure your environment by editing the *lxr.json* file, if required:
```json
{
  "host": "app.leanix.net",
  "apitoken": "your-api-token-here"
}
```

After this procedure, you should end up with the following project structure:

![](https://i.imgur.com/Am9Yx6w.png)

## Adjusting the report boilerplate source code

We need to make some modifications in our project's boilerplate code. We start by adding the following dependencies:
```bash
npm install --dev @babel/plugin-transform-runtime postcss-loader tailwindcss
npm install alpinejs moment chart.js pdfmake
```

 **Note:** During the course of this tutorial, we'll be using following libraries: [Alpine JS](https://github.com/alpinejs/alpine),  [Tailwind CSS](https://tailwindcss.com/), [Chart.js](https://www.chartjs.org/), [Moment.js](https://momentjs.com/) and [PDFMake](http://pdfmake.org/#/).

After installing the dependencies, we modify the *webpack.config.js* file and include the *@babel/plugin-transform-runtime* and the *postcss-loader*, as indicated by the red arrows in the picture below:

![](https://i.imgur.com/Vn0ZeWK.png)

 We then clean up our project source code by deleting the unnecessary files:
-  *src/report.js*
-  *src/fact-sheet-mapper.js*
-  *src/assets/bar.css*
-  *src/assets/main.css*

Next we create a *postcss.config.js* file in the **root** folder of our project, with the following content:
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer')
  ]
}
```

Additionally we create an *tailwind.css* file in the assets folder with the following content:

```css
/* src/assets/tailwind.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply text-gray-800;
    font-size: 12px;
  }
}
```

Next you should set the *src/index.html* file with the contents below:
```html
<!-- src/index.html -->
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="application-name" content="leanix-custom-report-tutorial-07">
  <meta name="description" content="Tutorial on how to create a PDF document from workspace data">
  <meta name="author" content="LeanIX GmbH">
  <title>Tutorial on how to create a PDF document from workspace data</title>
  <style>
    [x-cloak] {
      display: none;
    }
  </style>
</head>
<body x-data="initializeContext()" x-init="initializeReport()">
  <div x-cloak class="container mx-auto h-screen">
  </div>
</body>
</html>
```

And finally set the *src/index.js* file content as follows:
```javascript
// src/index.js
import 'alpinejs'
import '@leanix/reporting'
import moment from 'moment'
import Chart from 'chart.js'
import pdfMake from 'pdfmake/build/pdfmake'
import './assets/tailwind.css'

const state = {
  reportSetup: {},
  itComponents: [],
  obsoleteITComponents: [],
  columns: [
    { key: 'obsolescenceDate', label: 'Obsolescence Date' },
    { key: 'category', label: 'Category' },
    { key: 'name', label: 'IT Component' }
  ],
  dataUrl:  undefined,
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
  },
  computeObsolescencies () {
  },
  generateBarChart () {
  },
  generatePDF () {
  }
}

window.initializeContext = () => {
  return {
    ...state,
    ...methods
  }
}
```

Your project folder should look now like this:
![](https://i.imgur.com/ySmBBd0.png)

You may start the development server now by running the following command:
```bash
npm start
```
**Note!**

When you run *npm start*, a local webserver is hosted on *localhost:8080* that allows connections via HTTPS. But since just a development SSL certificate is created the browser might show a warning that the connection is not secure. You could either allow connections to this host anyways, or create your own self-signed certificate: https://www.tonyerwin.com/2014/09/generating-self-signed-ssl-certificates.html#MacKeyChainAccess.

If you decide to add a security exception to your localhost, make sure you open a second browser tab and point it to https://localhost:8080. Once the security exception is added to your browser, reload the original url of your development server and open the development console. Your should see a screen similar to the one below:

![](https://i.imgur.com/Jrn3RXQ.png)

Now that we have the base structure for our Custom Report, let's proceed into its design!

## Custom Report Design

We'll organize our custom report in two columns. On the leftmost  column we'll place two datepicker inputs, through which the use can set the start and end dates of the analysis. Also, we'll include on top of our left column an action button that will trigger the generation of the PDF document. Moreover, and also on the left column, we'll have three rows. On the first row we'll display a Bar Chart showing, by category - Hardware, Software or Service, the number of IT Components that get obsolete during the selected period. On the second row we'll display a scrollable table listing all those same IT Components. Finally, the third row will consist of a text area in which the user can write a couple of words on the obsolescence situation.

![](https://svgshare.com/i/PdL.svg)

As a first step, we'll edit the *src/index.html* file and add the basic template of our report by replacing the existing ``body`` tag content by the content indicated below:
```html
<!-- src/index.html -->
(...)
<body
  x-data="initializeContext()"
  x-init="() => {
    initializeReport()
    fetchDataset()
    // watcher for startDate, trigger computeObsolescencies method
    $watch('startDate', () => computeObsolescencies())
    // watcher for endDate, trigger computeObsolescencies method
    $watch('endDate', () => computeObsolescencies())
    // watcher for dataset, trigger computeObsolescencies method
    $watch('dataset', () => computeObsolescencies())
  }">
  <div x-cloak class="h-screen flex p-4 gap-4">
    <!-- Left Column Container -->
    <div class="w-1/2 overflow-auto py-4">
      <!-- Top ActionBar Container -->
      <div class="flex justify-end mb-4 gap-2">
        <div class="flex text-sm gap-4 py-2 justify-center items-center">
          <!-- StartDate DatePicker -->
          <div>
            <label for="startDate" class="font-medium">Start Date</label>
            <input
              x-model.debounce="startDate"
              type="date"
              id="startDate"
              required
              class="border rounded text-xs">
          </div>
          <!-- /StartDate DatePicker -->
          <!-- EndDate DatePicker -->
          <div>
            <label for="endDate" class="font-medium">End Date</label>
            <input
              x-model.debounce="endDate"
              type="date"
              id="endDate"
              required
              class="border rounded text-xs">
          </div>
          <!-- /EndDate DatePicker -->
        </div>
        <div class="flex-1"></div>
        <!-- GeneratePDF Button -->
        <button
          @click="generatePDF"
          type="button"
          class="inline-flex gap-1 items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded text-white bg-green-600 hover:bg-green-500 transition ease-in-out duration-150">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"  xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
          Generate PDF
        </button>
         <!-- /GeneratePDF Button -->
      </div>
      <!-- /Top ActionBar Container -->
      <div class="flex flex-col gap-6">
        <!-- Chart Container -->
        <div>
          <div class="text-center font-medium mb-2">Obsolescences per IT Component Category</div>
          <div class="h-56 relative border rounded shadow">
            <canvas x-show="obsoleteITComponents.length" x-ref="barChart"></canvas>
            <div x-show="!obsoleteITComponents.length" class="italic absolute" style="top: 50%; left: 50%; transform: translate(-50%)">
              Nothing to display...
            </div>
          </div>
        </div>
        <!-- /Chart Container -->
        <!-- List Container -->
        <div>
          <div class="text-center font-medium mb-2" x-text="'IT Component Obsolescences (' + obsoleteITComponents.length + ')'"></div>
          <div class="h-40 overflow-auto border shadow rounded relative">
            <table x-show="obsoleteITComponents.length"  class="table-auto w-full bg-white border-separate border border-t-0 border-grey" :style="'border-spacing: 0'">
              <thead>
                <tr>
                  <template x-for="(column, idx) in columns" :key="idx">
                    <th class="border-r border-b border-grey sticky top-0 bg-gray-100 font-normal p-1"  x-text="column.label"></th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <template x-for="(row, idx) in obsoleteITComponents" :key="idx">
                  <tr>
                    <template x-for="column in columns" :key="column.key">
                      <td class="p-1 border-b border-r" x-text="row[column.key].label || row[column.key]"></td>
                    </template>
                  </tr>
                </template>
              </tbody>
            </table>
            <div x-show="!obsoleteITComponents.length" class="italic absolute" style="top: 50%; left: 50%; transform: translate(-50%)">
              No IT Component obsolescence is scheduled for the selected period...
            </div>
          </div>
        </div>
        <!-- /List Container -->
        <!-- TextArea Container -->
        <div>
          <div class="text-center font-medium mb-2">Analysis</div>
            <textarea
              placeholder="Write your comment here..."
              x-model="analysis"
              rows="6"
              class="bg-white w-full shadow border rounded p-2 text-xs">
            </textarea>
        </div>
        <!-- /TextArea Container -->
      </div>
    </div>
    <!-- /Left Column Container -->
    <!-- Right Column Container -->
    <div class="bg-green-100 w-1/2 border">
      <template x-if="dataUrl">
        <!-- PDF Viewer Container -->
        <embed :src="dataUrl" type="application/pdf" width="100%" height="100%">
        <!-- /PDF Viewer Container -->
      </template>
    </div>
    <!-- /Right Column Container -->
  </div>
</body>
(...)
```
Notice the [x-init](https://github.com/alpinejs/alpine#x-init) directive included in our *body* tag. This directive calls the *intializeReport* and *fetchDataset* methods once the report is instantiated, and add watchers for *startDate*, *endDate*, and *dataset* state variables that trigger, on change, the *computeObsolescencies* method. Notice as well that we have added a [@click](https://github.com/alpinejs/alpine#x-on) event listener in our "GeneratePDF" that calls the *generatePDF* method. Since we have previously created empty placeholders for all those methods in the *methods* object of our *src/index.js* file, we'll implement them ahead in this tutorial.

Your report should look like this now:

![](https://i.imgur.com/LsWkaIX.png)


## Business Logic
The business logic for our report will consist of four main functionalities:
- fetching data
- computing obsolete it components
- generate the bar chart
- generate the PDF document

In this chapter, we'll cover the implementation of each, individually.

### Fetching Data
The first method we'll cover is the *fetchDataset*. With this method we fetch information on all IT Components existing in our workspace. More specifically, we are interested in getting three attributes of each IT Component: name, category and lifecycle. We'll use the [lx.executeGraphQL](https://leanix.github.io/leanix-reporting/classes/lxr.lxcustomreportlib.html#executegraphql) method to fetch our dataset and store it using the *itComponents* state variable. Also, recall that this method is triggered only once via the the [x-init](https://github.com/alpinejs/alpine#x-init) directive included in our *body* tag. Proceed by copying and pasting the *fetchDataset* method given below to the placeholder in your *src/index.js* file.
```javascript
// src/index.js
(...)
const methods = {
    (...)
    async fetchDataset () {
        const query = `{
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
        }`
        this.itComponents = await lx.executeGraphQL(query)
          .then(data => data.allFactSheets.edges.map(({ node }) => node))
    },
    (...)
}
```

### Computing Obsolescencies
Once we have fetched the information on all IT Components, it is time to compute the obsolescency state for each during the user-defined date range. By obsolete, we mean that the IT Component transitions into the "End of Life" lifecycle phase within the date range specified by the user. Therefore, our *computeObsolescencies* method will traverse the *itComponents* array in order to filter in obsolete IT Components. The result of this filtering will be stored on the *obsoleteITComponent* state variable. Moreover, after this filtering operation is completed, it triggers the *generateBarChart* method which we'll cover ahead. Also, keep in mind that the *computeObsolescencies* method is triggered by the watchers we have previously set up in the [x-init](https://github.com/alpinejs/alpine#x-init) directive included in the *body* tag of our custom report html template. As before, copy and past the code snippet below into your *src/index.js* file.

```javascript
// src/index.js
(...)
const methods = {
    (...)
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
    (...)
}
```
Now, if you observe your report, you should see the list of obsolete IT Components being shown on the second row of the leftmost column. If nothing shows up, try tweaking the start and end dates of your analysis in order to capture some obsolescence event!
![](https://i.imgur.com/mBV2Exw.png)
Good work, let's carry on and generate the chart!

### Generating the Bar Chart
Having computed the list of IT Components that get obsolete during the date range specified by the user, we want to display that information on a *bar chart* that shows the obsolescency frequency of each IT Component category during that period. Therefore we'll create an index of obsolete IT Component categories, based on our *obsoleteITComponent* state variable, and use it for generating a [Bar Chart](https://www.chartjs.org/docs/latest/charts/bar.html) using the popular [Chart.js](https://www.chartjs.org/) library. The chart will be rendered in the *canvas* element, referenced as *"barChart"*, that we created before in our html template.

```javascript
// src/index.js
(...)
const methods = {
    (...)
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
    (...)
}
```
Our custom report should be displaying now the chart! If not, try tweaking on your start and end dates until an IT Component of your workspace gets obsolete during in that period.
![](https://i.imgur.com/IcLvF5f.png)

Having included the chart in our report, we'll proceed in our tutorial by generating the PDF document out of it!

### Generating the PDF Document
We want our exported PDF document to follow a certain style and structure, and to include the bar chart, the list, and the text content that we have in our custom report. For that, we'll make use of the versatile [PDFmake](http://pdfmake.org) library. This library is well [documented](https://pdfmake.github.io/docs/) and offers an interesting [playground](http://pdfmake.org/playground.html) that can be used to explore the variety of available features. In our case, we'll define the PDF document structure in the *dd* variable of the *generatePDF* method. We'll tweak our document's design by setting the desired page size, orientation, margins, images, fonts, and default styles and content. We highly recommend consulting the [PDFMake](https://pdfmake.github.io/docs/0.1/) documentation for further details on its API and features.
Copy and past the *generatePDF* method given below into our *src/index.js* file:
```javascript
// src/index.js
(...)
const methods = {
    (...),
    generatePDF () {
        const dd = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: 1 * 72, // 2.54 cm - 1 in converted to points, pageMargins is specified in points...
            images: { barChart: this.$refs.barChart.toDataURL() },
            defaultStyle: { font: 'Roboto', fontSize: 9 },
            styles: {
                titleBlock: { alignment: 'center', margin: [0, 0, 0, 40] },
                header: { fontSize: 18, bold: true, alignment: 'center' },
                subheader: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
                section: { margin: [0, 0, 0, 50] }
            },
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
                    { text: 'Obsolescences per IT Component Category', style: 'subheader' },
                    this.obsoleteITComponents.length
                        ? { image: 'barChart', fit: [420, 200] }
                        : { text: 'No obsolete it components during this period...', italics: true, alignment: 'center' }
                ]
            },
            {
                style: 'section',
                stack: [
                    { text: `IT Component Obsolescences`, style: 'subheader' },
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
              { text: 'Analysis', style: 'subheader' },
              this.analysis
                  ? { text: this.analysis, alignment: 'justify '}
                  : { text: 'no comments', alignment: 'center', italics: 'true' }
              ]
            }
          ]
        }
        const fonts = {
          Roboto: {
            normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
            bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
            italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
            bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
          }
        }
        const pdfDocGenerator = pdfMake.createPdf(dd, undefined, fonts)
        pdfDocGenerator.getDataUrl(dataUrl => { this.dataUrl = dataUrl })
    }
}
```
If if you click on the *Generate PDF* button you should be able to see on the right column a preview of the exported document!
![](https://i.imgur.com/MFgphd3.png)


## Conclusions and next steps
In this tutorial we have covered a way of exporting a LeanIX Custom Report into a PDF document that follows a specific design and layout. This is a very interesting technique that can be used for generating normalized documentation, straight out of your LeanIX workspace, which meets your organization's policies, designs or guidelines. As an interesting follow-up exercise for the reader, we recommend to adjust the design and structure of the PDF template provided in this tutorial to your organization requirements. Thank you and good work!
