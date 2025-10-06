document.addEventListener('DOMContentLoaded', function () {
  const colorOptions = document.querySelectorAll('.color-option')
  colorOptions.forEach(option => {
    option.addEventListener('click', function () {
      colorOptions.forEach(opt => opt.classList.remove('selected'))
      this.classList.add('selected')
      // Update the correct hidden input based on which modal is open
      const modals = ['addLinkModal', 'editLinkModal']
      for (let modal of modals) {
        if (document.getElementById(modal).style.display === 'flex') {
          document.getElementById(
            modal === 'addLinkModal' ? 'linkColor' : 'editLinkColor'
          ).value = this.dataset.color
          break
        }
      }
    })
  })

  // Set default color
  if (colorOptions.length > 0) {
    colorOptions[0].classList.add('selected')
    document.getElementById('linkColor').value = colorOptions[0].dataset.color
    document.getElementById('editLinkColor').value =
      colorOptions[0].dataset.color
  }
})

// Close dropdowns when clicking outside
document.addEventListener('click', function (e) {
  const dropdowns = document.querySelectorAll('.dropdown-menu')
  dropdowns.forEach(dropdown => {
    if (
      !dropdown.contains(e.target) &&
      !e.target.classList.contains('menu-btn')
    ) {
      dropdown.classList.remove('show')
    }
  })
})

// Edit mode state
let editMode = false

// Toggle edit mode
const editModeToggle = document.getElementById('editModeToggle')

if (editModeToggle) {
  editModeToggle.addEventListener('click', function () {
    editMode = !editMode
    this.textContent = editMode ? 'Exit Edit Mode' : 'Edit Mode'
    this.style.background = editMode
      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
      : 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))'

    // Show/hide menu buttons and drag handles
    const menuBtns = document.querySelectorAll('.menu-btn')
    const dragHandles = document.querySelectorAll('.drag-handle')
    const addCategoryBtn = document.getElementById('addCategoryBtn')

    if (editMode) {
      menuBtns.forEach(btn => btn.classList.add('show'))
      dragHandles.forEach(handle => handle.classList.add('show'))
      addCategoryBtn.classList.add('show')
    } else {
      menuBtns.forEach(btn => btn.classList.remove('show'))
      dragHandles.forEach(handle => handle.classList.remove('show'))
      addCategoryBtn.classList.remove('show')
    }
  })
}

// Data structure for categories with multiple subheaders and their links
let categories = [
  {
    name: 'Administrative',
    icon: '📋',
    subheaders: [
      {
        title: 'General Administrative',
        links: [
          {
            name: 'Charge Codes',
            url: 'file:///J:/Engineering/Distribution/CHARGE%20CODES',
            class: 'bg-blue',
          },
          {
            name: 'E13 Desk Booking',
            url: 'http://pq.bchydro.bc.ca:99/index.php',
            class: 'bg-blue',
          },
          {
            name: 'Employee Onboarding',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/DE%20Employee%20Onoboarding/Forms/AllItems.aspx',
            class: 'bg-blue',
          },
          {
            name: 'OPPRA',
            url: 'https://w3oppra.bchydro.bc.ca/hrperf/',
            class: 'bg-blue',
          },
          {
            name: 'Employee Connect',
            url: 'https://hydrosap.bchydro.bc.ca/irj/portal/',
            class: 'bg-blue',
          },
          {
            name: 'CLRA Solution Office',
            url: 'https://hw.bchydro.bc.ca/p/clra-solution-office/Pages/Home.aspx',
            class: 'bg-blue',
          },
          {
            name: 'RDE Request Tracker',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Programs/RDE%20Request%20Tracker.xlsx?d=w7802169b77d442e58ac24d9f1a25c338',
            class: 'bg-blue',
          },
          {
            name: 'DE SharePoint Editor Tool',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/html/txt2html.html',
            class: 'bg-blue',
          },
          {
            name: 'Related Files',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/source/',
            class: 'bg-blue',
          },
        ],
      },
      {
        title: 'DELT',
        links: [
          {
            name: 'DELT',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/DELT/Forms/AllItems.aspx',
            class: 'bg-blue',
          },
          {
            name: 'Business Review',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Business_Review/Forms/AllItems.aspx',
            class: 'bg-blue',
          },
          {
            name: 'ScoreCard',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/DE_SCORECARD/Forms/AllItems.aspx',
            class: 'bg-blue',
          },
          {
            name: 'Leadership Team Advisory Site',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distributionengineeringadvisories/SitePages/Home.aspx',
            class: 'bg-blue',
          },
        ],
      },
      {
        title: 'DE Base Accountability',
        links: [
          {
            name: 'Core Pathway',
            url: '/sites/de/Lists/SharedDocuments/DE%20Base%20Job%20Accountabilities/DE%20Role%20Alignment%20-%20Core%20Pathway%20rev0.pdf',
            class: 'bg-blue',
          },
          {
            name: 'Technical Pathway',
            url: '/sites/de/Lists/SharedDocuments/DE%20Base%20Job%20Accountabilities/DE%20Role%20Alignment%20-%20Technical%20Pathway%20rev0.pdf',
            class: 'bg-blue',
          },
          {
            name: 'Leadership Pathway',
            url: '/sites/de/Lists/SharedDocuments/DE%20Base%20Job%20Accountabilities/DE%20Role%20Alignment%20-%20Leadership%20Pathway%20rev0.pdf',
            class: 'bg-blue',
          },
        ],
      },
    ],
  },
  {
    name: 'Tools & Applications',
    icon: '🛠️',
    subheaders: [
      {
        title: 'General Tools',
        links: [
          {
            name: 'DesignHub',
            url: 'https://designhub.bchydro.bc.ca/web/app',
            class: 'bg-teal',
          },
          {
            name: 'JotForm',
            url: 'https://www.jotform.com/tables/220326998667067?st=bFFTdTNMRzRGNTFWWVFYMTVTcmFaVUcyM05YU2pHb0Rxc0lxY25QZWRzK2k5Ykt0aEo2L1NiTUF2dVp0cExtUXJlQnpONXV0d242Y0ZnQnpobkltWDF1WVJ2bnhrejc3Y1BqWTlCeDVGdFgvOEpBYnlkMk5PSHdNMUhvVWo4eXU=',
            class: 'bg-teal',
          },
          {
            name: 'IEDG Application Site',
            url: 'https://hydroshare.bchydro.bc.ca/sites/iedga/SitePages/Home.aspx',
            class: 'bg-teal',
          },
          {
            name: 'AAG for IEDG',
            url: 'https://aag.bchydro.bc.ca/logon/LogonPoint/tmindex.html',
            class: 'bg-teal',
          },
          {
            name: 'P&C Bus Fault Summary',
            url: 'file:///J:/Engineering/Distribution/CYME/Development/Equipment%20Database/Source%20Equivalent',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'ASPEN',
        links: [
          {
            name: 'ASPEN Relay Database™',
            url: 'http://kdcssweb1/aspen/rdbweb.exe',
            class: 'bg-teal',
          },
          {
            name: 'ASPEN PN Query',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/html/Aspen%20PN.html',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'Drawings',
        links: [
          {
            name: 'McLaren Drawings Search',
            url: 'https://w3ecm.bchydro.bc.ca/search/searchDist.html',
            class: 'bg-teal',
          },
          {
            name: 'Grid Ops Diagrams Data',
            url: 'file:///Q:/Field%2520Reference%2520Info/Grid%2520Ops%2520Diagrams%2520Data',
            class: 'bg-teal',
          },
          {
            name: 'DE CADD Drafting Request',
            url: 'https://cadd-engserv-bchydro.atlassian.net/servicedesk/customer/portals',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'Databases',
        links: [
          {
            name: 'EAS',
            url: 'https://eas.bchydro.bc.ca/home/index.html',
            class: 'bg-teal',
          },
          {
            name: 'Distribution Planning - Tableau®',
            url: 'https://bchtableau.bchydro.bc.ca/#/site/AssetDistributionPlanning/home',
            class: 'bg-teal',
          },
          {
            name: 'Distribution Planning Record Documents',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distplan/DPRD/SitePages/Home.aspx?RootFolder=%2Fsites%2Fdistplan%2FDPRD%2FShared%20Documents%2FRDP&FolderCTID=0x012000D5EEE1F381027E4E89B2E794D6118D86&View=%7BEF36BA26%2D5104%2D45A5%2D99B6%2D28741059F1EC%7D',
            class: 'bg-teal',
          },
          {
            name: 'Feeder Load Research Tool - SAS®',
            url: 'https://kdcsasva3.bchydro.bc.ca:8343/SASLogon/login?service=https://kdcsasva3.bchydro.bc.ca:8343/SASVisualAnalyticsHub/',
            class: 'bg-teal',
          },
          {
            name: 'BCH ArcGIS®',
            url: 'https://kdcesriweb1.bchydro.adroot.bchydro.bc.ca/gisportal/home/index.html',
            class: 'bg-teal',
          },
        ],
      },
    ],
  },
  {
    name: 'Useful Links',
    icon: '🔗',
    subheaders: [
      {
        title: 'Engineering Resources',
        links: [
          {
            name: 'Engineering HydroShare',
            url: 'https://hydroshare.bchydro.bc.ca/sites/engineering/SitePages/Home.aspx',
            class: 'bg-green',
          },
          {
            name: 'Engineering Resources & Templates',
            url: 'https://hydroshare.bchydro.bc.ca/sites/engineering/SitePages/Engineering.aspx',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Standards',
        links: [
          {
            name: 'PQweb',
            url: 'http://pq.bchydro.bc.ca/index.php',
            class: 'bg-green',
          },
          {
            name: 'DSwiki',
            url: 'http://edmbchwiki1/dist/standards/index.php/Main_Page',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Design',
        links: [
          {
            name: 'PAT',
            url: 'https://kdcbchpoweb1.bchydro.bc.ca:7004/pat/',
            class: 'bg-green',
          },
          {
            name: 'WikiDI',
            url: 'http://edmbchwiki1/di/index.php/Main_Page',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Projects',
        links: [
          {
            name: 'SPOT',
            url: 'https://kdcsswebp1.bchydro.bc.ca/fetbch/usr/userindex.aspx',
            class: 'bg-green',
          },
          {
            name: 'PCM Info Center',
            url: 'https://edmppmprt1.bchydro.bc.ca/pcm_ic/pcmic.htm',
            class: 'bg-green',
          },
          {
            name: 'PPM Info Center',
            url: 'https://edmppmprt1.bchydro.bc.ca/ppmic/_ppmic_home.htm',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'General Links',
        links: [
          {
            name: 'Revenue Metering',
            url: 'https://hw.bchydro.bc.ca/basicpage/Revenue-Metering',
            class: 'bg-green',
          },
          {
            name: 'DR',
            url: 'https://hydroshare.bchydro.bc.ca/workgroup/d_requests/Lists/Contacts/AllItems.aspx',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Operations',
        links: [
          {
            name: 'CROW',
            url: 'http://crwbchprweb01/crow/Logging/log_index.aspx',
            class: 'bg-green',
          },
          { name: 'SIS', url: 'http://w3ecm/sis/', class: 'bg-green' },
          {
            name: 'Major Outage Briefing Note',
            url: 'file:///J:/Engineering/Distribution/1%20Reporting/10000%20Customer%20Hours%20Lost%20Reports',
            class: 'bg-green',
          },
          {
            name: 'Feeder Limits Database',
            url: 'https://hydroshare.bchydro.bc.ca/sites/doperation/SitePages/Home.aspx',
            class: 'bg-green',
          },
          {
            name: 'PowerOn Remote',
            url: 'https://poweronremote.bchydro.bc.ca/poweronremote/',
            class: 'bg-green',
          },
          {
            name: 'DASM HydroShare',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distplan/dasm/SitePages/Home.aspx',
            class: 'bg-green',
          },
        ],
      },
    ],
  },
  {
    name: 'Technical References',
    icon: '📚',
    subheaders: [
      {
        title: 'Learning & Development',
        links: [
          {
            name: 'Learning & Development',
            url: 'file:///J:/Engineering/Distribution/1%20Learning%20and%20Development%20Committee',
            class: 'bg-blue',
          },
          {
            name: 'DE Knowledge OneNote',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/DEKnowledgeOneNote',
            class: 'bg-blue',
          },
          {
            name: 'LMN Knowledge Sharing Sessions',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/_layouts/15/WopiFrame.aspx?sourcedoc=%7BA9B67C3A-B947-49B5-B83E-91F5145BE183%7D&file=1%20LMN%20OneNote&action=default&d=wa9b67c3ab94749b5b83e91f5145be183&Source=https%3A%2F%2Fhydroshare%2Ebchydro%2Ebc%2Eca%2Fsites%2Fde%2FLMN%2520Share%2520Files%2FForms%2FAllItems%2Easpx&RootFolder=%2fsites%2fde%2fLMN%20Share%20Files%2f1%20LMN%20OneNote',
            class: 'bg-blue',
          },
          {
            name: 'Conferences & Seminars',
            url: 'file:///J:/Engineering/Distribution/1%20Conferences%20and%20Seminars',
            class: 'bg-blue',
          },
          {
            name: 'BCH Library and Archives',
            url: 'https://hw.bchydro.bc.ca/p/bc-hydro-library-and-archives/Pages/Home.aspx',
            class: 'bg-blue',
          },
        ],
      },
      {
        title: 'Conductor Slap',
        links: [
          {
            name: 'Technical Report',
            url: 'http://edmbchpq1/files/EPRI/EPRI_3002014978.pdf',
            class: 'bg-blue',
          },
          {
            name: 'Modelling / Calculator',
            url: 'http://distributionhandbook.com/calculators/mdpad.html?conductor_slapping.md',
            class: 'bg-blue',
          },
        ],
      },
      {
        title: 'CYME',
        links: [
          {
            name: 'EATON® CYME',
            url: 'file:///J:/Engineering/Distribution/CYME',
            class: 'bg-blue',
          },
          {
            name: 'Short Circuit Report',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/_layouts/OneNote.aspx?id=%2Fsites%2Fde%2FDEKnowledgeOneNote&wd=target%28Technical%20Specialization%20Teams%2FProtection%20and%20Modeling%2FCyme.one%7C95806A46-FEC1-43A0-A4D0-DFDB268E1CCA%2FShort%20Circuit%20FAULT_POINT%20Script%7C8590C908-11C6-4FF5-93F9-D49EB349AF86%2F%29',
            class: 'bg-blue',
          },
        ],
      },
    ],
  },
  {
    name: 'Teams',
    icon: '👥',
    subheaders: [
      {
        title: 'Organizational Structure',
        links: [
          {
            name: 'DE Org Chart',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/DE%20Org%20Chart%20PDF/Engineering%20Design%20D-Engineering.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Lower Mainland North',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/LMN%20-%20Regional%20Area%20Substations.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Lower Mainland South',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/LMS%20-%20Regional%20Area%20Substations.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Interior & NIA',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/INT%20-%20Regional%20Area%20Substations.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Vancouver Island',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/VI%20-%20Regional%20Area%20Substations.pdf',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'Project Teams',
        links: [
          {
            name: 'Projects Hydroshare',
            url: 'https://hydroshare.bchydro.bc.ca/sites/DistributionEngineeringProjects/SitePages/Home.aspx',
            class: 'bg-teal',
          },
          {
            name: 'Project A',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/Projects%20A%20Team%20Member%20List.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Project B',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/Projects%20B%20Team%20Member%20List.pdf',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'Specialized Engineering',
        links: [
          {
            name: 'Distribution Civil Engineering',
            url: 'https://hydroshare.bchydro.bc.ca/sites/DCE/default.aspx',
            class: 'bg-teal',
          },
          {
            name: 'DE Program Team',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Team%20Charter.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Estimating',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/DE%20Photo%20Org%20Chart/Estimating.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Protection & Modelling',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/Protection%20and%20Modeling%20Team.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Distribution Feeders',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Regional%20Maps/Distribution%20Feeders%20Team.pdf',
            class: 'bg-teal',
          },
          {
            name: 'Applied Engineering',
            url: 'https://hydroshare.bchydro.bc.ca/sites/applied_distribution_engineering/SitePages/Home.aspx',
            class: 'bg-teal',
          },
          {
            name: 'Non-Linear Analysis Team',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/DEKnowledgeOneNote/Overhead%20Line%20Design%20%20(NLA)%20Team',
            class: 'bg-teal',
          },
        ],
      },
    ],
  },
  {
    name: 'Procedures & Guidelines',
    icon: '📜',
    subheaders: [
      {
        title: 'Design & Engineering',
        links: [
          {
            name: 'External Design & Engineering DBR',
            url: 'https://edmppmprt1.bchydro.bc.ca/DBR/Home.htm',
            class: 'bg-green',
          },
          {
            name: 'EDQA',
            url: 'https://edmppmprt1.bchydro.bc.ca/DBR/Stakeholder-Engagement/Internal/EDQA.htm',
            class: 'bg-green',
          },
          {
            name: "Owner's Engineering Guide",
            url: 'https://w3ecm.bchydro.bc.ca/fglob/ViewDocumentContentBySeriesId.do?guid=%7B1059ECC4-3B1D-409B-BA0B-98B14FF8B2DF%7D',
            class: 'bg-green',
          },
          {
            name: 'Design Review Comment Sheet',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/OE%20Reviews/Forms/Design%20Review%20Sheet%20-%20Distribution%20Engineering.docx?d=w6ead9d330136412390bead5f1499a1f8',
            class: 'bg-green',
          },
          {
            name: 'Design Review Evaluation Form',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/OE%20Reviews/Forms/Design%20Review%20Evaluation%20Form%20%E2%80%93%20Distribution%20Engineering.docx?d=wb8cc734feb30426cb65d70c302958155',
            class: 'bg-green',
          },
          {
            name: 'DE Project Completion Form',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/OE%20Reviews/Forms/DE%20Project%20Completion%20Confirmation%20of%20Professional%20Field%20Review.pdf',
            class: 'bg-green',
          },
          {
            name: 'OE Review Evaluation Summary',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/OE%20Reviews',
            class: 'bg-green',
          },
          {
            name: 'CIPD Guide',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/DISTRIBUTION_ENGINEERING_CIPD_GUIDE_REV0_2023-06-02.pdf',
            class: 'bg-green',
          },
          {
            name: 'Voltage Management Guideline',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distplan/OfficialRelease/Voltage_Management_BCH-DSR-2014-1001.pdf',
            class: 'bg-green',
          },
          {
            name: 'Voltage Conversion Guide',
            url: 'file:///J:/Engineering/Distribution/Voltage%20Conversion%20Related%20%20Documents/VC%20Presentation%20-%20Feb%202017',
            class: 'bg-green',
          },
          {
            name: 'Protection Coordination Guideline',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distplan/OfficialRelease/CircuitProtectionCoordinationGuideline_R02-BCH-DSR-2014-1002.pdf',
            class: 'bg-green',
          },
          {
            name: 'Distribution Automation Deployment Strategies',
            url: 'https://hw.bchydro.bc.ca/basicpage/Distribution-Automation-Deployment-Strategies',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Review Processes',
        links: [
          {
            name: 'Capacity Review Process',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distplan/Lists/SharedDocuments/DESRT%20Request%20Tasks%20-%20Engineering%20and%20Planning.pdf',
            class: 'bg-green',
          },
          {
            name: 'DESRT Process - Planning & Engineering Tasks',
            url: 'https://hydroshare.bchydro.bc.ca/sites/distplan/Lists/SharedDocuments/DESRT%20Request%20Tasks%20-%20Engineering%20and%20Planning.pdf',
            class: 'bg-green',
          },
          {
            name: 'Unconfirmed Load Review Form',
            url: 'https://hydroshare.bchydro.bc.ca/sites/cc/DDCCWorkSmartPublishedAssets/F23QW01-Implement-QSL-Integrated-Planning/DDCC%20Work%20Smart%20-%20Unconfirmed%20Load%20Requirements%20Form.pdf',
            class: 'bg-green',
          },
          {
            name: 'Distribution Connection Variance Request Guide',
            url: 'https://app.bchydro.com/content/dam/BCHydro/customer-portal/documents/distribution/info-packages/customer-guide-to-variance-requests.pdf',
            class: 'bg-green',
          },
        ],
      },
    ],
  },
  {
    name: 'Professional Practice',
    icon: '💼',
    subheaders: [
      {
        title: 'Professional Development',
        links: [
          {
            name: 'Respectful Workplace Program',
            url: 'https://hw.bchydro.bc.ca/basicpage/respectful-workplace',
            class: 'bg-blue',
          },
          {
            name: 'PGA - EGBC Home',
            url: 'https://hydroshare.bchydro.bc.ca/sites/PGA/SitePages/Home.aspx',
            class: 'bg-blue',
          },
          {
            name: 'EGBC Filing - Guides and References',
            url: 'file://bchydro.adroot.bchydro.bc.ca/data/Engineering/Distribution/0%20EGBC%20Filing/0%20Guidelines%20and%20References',
            class: 'bg-blue',
          },
          {
            name: 'DESRT Memo Template',
            url: 'https://hydroshare.bchydro.bc.ca/sites/PGA/_layouts/15/WopiFrame.aspx?sourcedoc=%7BE644A337-F1EE-4B8B-86EE-1625E9FAF170%7D&file=DESRT%20Memo.docx&action=default',
            class: 'bg-blue',
          },
          {
            name: 'CNS',
            url: 'http://kdcssweb1/cns/Account/Login?ReturnUrl=%2Fcns%2F',
            class: 'bg-blue',
          },
          {
            name: 'Signature Verification - verifiO',
            url: 'https://verifio.com/document',
            class: 'bg-blue',
          },
          {
            name: 'Field Review Tracking',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/Field%20Review%20Tracking/Active%20Items.aspx',
            class: 'bg-blue',
          },
          {
            name: 'SuccessFactors Learning',
            url: 'https://hcm17.sapsf.com/login?company=bchydro',
            class: 'bg-blue',
          },
        ],
      },
    ],
  },
  {
    name: 'Health & Safety',
    icon: '🛡️',
    subheaders: [
      {
        title: 'Safety Framework',
        links: [
          {
            name: 'Safety Framework',
            url: 'https://hw.bchydro.bc.ca/basicpage/safety-framework',
            class: 'bg-teal',
          },
          {
            name: 'SafeHub',
            url: 'https://hydroshare.bchydro.bc.ca/sites/safehub/Home.aspx',
            class: 'bg-teal',
          },
          {
            name: 'PSSP',
            url: 'https://hw.bchydro.bc.ca/basicpage/pssp',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'Safety by Design',
        links: [
          {
            name: 'Overhead Checklist',
            url: 'http://w3filenet/PRT.%7B98F4B82F-6171-426D-B48D-2B2190124244%7D',
            class: 'bg-teal',
          },
          {
            name: 'Underground Checklist',
            url: 'http://w3filenet/PRT.%7BE9070D1A-584A-4C17-8912-4B7A37A233A1%7D',
            class: 'bg-teal',
          },
        ],
      },
      {
        title: 'Safety Documentation',
        links: [
          {
            name: 'Safety Folder',
            url: 'file:///J:/Engineering/Distribution/1%20Safety/1%20F21%20Safety/',
            class: 'bg-teal',
          },
          {
            name: 'Reported Safety Incidents',
            url: 'file:///J:/Engineering/Distribution/1%20Administration/Safety%20Incidents%20DE',
            class: 'bg-teal',
          },
          {
            name: 'Underground Asbestos Program',
            url: 'https://hydroshare.bchydro.bc.ca/workgroup/dist_underground_asb/Completed%20Inspections%20Forms/Forms/AllItems.aspx',
            class: 'bg-teal',
          },
          {
            name: 'AIS',
            url: 'https://kdcssweb1.bchydro.bc.ca/AIS#/',
            class: 'bg-teal',
          },
          {
            name: 'Emergency Response Plan',
            url: 'https://hydroshare.bchydro.bc.ca/sites/emergency_management/Plans/Emergency%20Response%20Plan%20-%20Engineering%20Design.pdf',
            class: 'bg-teal',
          },
        ],
      },
    ],
  },
  {
    name: 'Others',
    icon: '⚙️',
    subheaders: [
      {
        title: 'Administrative Procedures',
        links: [
          {
            name: 'Flood Plan Revision',
            url: 'file:///J:/Engineering/Distribution/DE%20Flood%20Plan',
            class: 'bg-green',
          },
          {
            name: 'Telematics',
            url: 'https://hw.bchydro.bc.ca/basicpage/telematics',
            class: 'bg-green',
          },
          {
            name: 'Branded Templates',
            url: 'https://hw.bchydro.bc.ca/basicpage/templates',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'IT Services',
        links: [
          {
            name: 'Application Portal',
            url: 'http://bchap/esd',
            class: 'bg-green',
          },
          {
            name: 'ServiceNow',
            url: 'https://bchydro.service-now.com/sp/',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Travel & Site Visits',
        links: [
          {
            name: 'Working Alone & Journey Management',
            url: 'https://hw.bchydro.bc.ca/basicpage/working-alone',
            class: 'bg-green',
          },
          {
            name: 'DE Specific Working Alone Procedure',
            url: 'file:///J:/Engineering/Distribution/1%20Safety/Working%20Alone%20or%20in%20Isolation%20Program/0%20CURRENT%20WORK%20ALONE%20PROCEDURE',
            class: 'bg-green',
          },
          {
            name: 'Business Travel',
            url: 'https://hw.bchydro.bc.ca/p/travel/Pages/Home.aspx',
            class: 'bg-green',
          },
          {
            name: 'Engineering - Field Work & Travel Form',
            url: 'https://hydroshare.bchydro.bc.ca/sites/engineering/HydroWeb%20Documents/Engineering%20Travel/Engineering%20Travel%20Form.pdf',
            class: 'bg-green',
          },
          {
            name: 'DE Travel Expense Submissions Guidelines',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Expense%20Forms%20%26%20Documents/Distribution%20Engineering%20Business%20Expense%20Submissions-Draft.pdf',
            class: 'bg-green',
          },
          {
            name: 'Engineering Expense Claim Template',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/SharedDocuments/Expense%20Forms%20&%20Documents/Engineering%20Expense%20Claim%20Template.xlsx',
            class: 'bg-green',
          },
        ],
      },
      {
        title: 'Vehicle Booking',
        links: [
          {
            name: 'Edmonds #1 – Ford Escape – DE LM team',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/Regional%20DE%20Pool%20Vehicle/calendar.aspx',
            class: 'bg-green',
          },
          {
            name: 'Edmonds #2 – Toyota RAV4 – DE Civil team',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/Vernon%20Pool%20Vehicle%20%2019S03/calendar.aspx',
            class: 'bg-green',
          },
          {
            name: 'Victoria – DE VI team',
            url: 'https://hydroshare.bchydro.bc.ca/sites/de/Lists/Victoria%20Pool%20Vehicle%20%2019S71/calendar.aspx',
            class: 'bg-green',
          },
        ],
      },
    ],
  },
]

// Function to create dropdown menu
function createDropdownMenu (
  type,
  categoryIndex,
  subheaderIndex = null,
  linkIndex = null
) {
  const dropdown = document.createElement('div')
  dropdown.className = 'dropdown-menu'

  if (type === 'category') {
    dropdown.innerHTML = `
          <a href="#" class="dropdown-item" onclick="openAddSubheaderModal(${categoryIndex}); event.stopPropagation();">Add Subheader</a>
          <a href="#" class="dropdown-item" onclick="openEditCategoryModal(${categoryIndex}); event.stopPropagation();">Change Category</a>
          <a href="#" class="dropdown-item delete" onclick="deleteCategory(${categoryIndex}); event.stopPropagation();">Delete Category</a>
      `
  } else if (type === 'subheader') {
    dropdown.innerHTML = `
          <a href="#" class="dropdown-item" onclick="openAddLinkModal(${categoryIndex}, ${subheaderIndex}); event.stopPropagation();">Add Link</a>
          <a href="#" class="dropdown-item" onclick="openEditSubheaderModal(${categoryIndex}, ${subheaderIndex}); event.stopPropagation();">Change Subheader</a>
          <a href="#" class="dropdown-item delete" onclick="deleteSubheader(${categoryIndex}, ${subheaderIndex}); event.stopPropagation();">Delete Subheader</a>
      `
  } else if (type === 'link') {
    dropdown.innerHTML = `
          <a href="#" class="dropdown-item" onclick="openEditLinkModal(${categoryIndex}, ${subheaderIndex}, ${linkIndex}); event.stopPropagation();">Change Link</a>
          <a href="#" class="dropdown-item delete" onclick="deleteLink(${categoryIndex}, ${subheaderIndex}, ${linkIndex}); event.stopPropagation();">Delete Link</a>
      `
  }

  return dropdown
}

// Function to render categories
function renderCategories (categoriesToRender) {
  const container = document.getElementById('categoriesContainer')
  if (container) {
    container.innerHTML = ''
  }

  categoriesToRender.forEach((category, categoryIndex) => {
    const categoryCard = document.createElement('div')
    categoryCard.className = 'category-card'

    const header = document.createElement('div')
    header.className = 'category-header'
    header.innerHTML = `
          <div class="category-title-container">
              <span class="category-icon">${category.icon}</span>
              <h2 class="category-title">${category.name}</h2>
          </div>
          <button class="menu-btn ${
            editMode ? 'show' : ''
          }" onclick="toggleCategoryMenu(event, ${categoryIndex})">⋮</button>
      `

    // Add dropdown menu for category
    if (editMode) {
      const categoryDropdown = createDropdownMenu('category', categoryIndex)
      header.appendChild(categoryDropdown)
    }

    categoryCard.appendChild(header)

    // Add each subheader section with its links
    category.subheaders.forEach((subheader, subheaderIndex) => {
      const subheaderSection = document.createElement('div')
      subheaderSection.className = 'subheader-section'

      const subheaderTitle = document.createElement('div')
      subheaderTitle.className = 'subheader-title'
      subheaderTitle.textContent = subheader.title

      const menuBtn = document.createElement('button')
      menuBtn.className = `menu-btn ${editMode ? 'show' : ''}`
      menuBtn.textContent = '⋮'
      menuBtn.onclick = function (e) {
        toggleSubheaderMenu(e, categoryIndex, subheaderIndex)
      }

      // Add dropdown menu for subheader
      if (editMode) {
        const subheaderDropdown = createDropdownMenu(
          'subheader',
          categoryIndex,
          subheaderIndex
        )
        subheaderSection.appendChild(subheaderDropdown)
      }

      subheaderSection.appendChild(subheaderTitle)
      subheaderSection.appendChild(menuBtn)
      categoryCard.appendChild(subheaderSection)

      const linksContainer = document.createElement('div')
      linksContainer.className = 'links-container'
      linksContainer.dataset.categoryIndex = categoryIndex
      linksContainer.dataset.subheaderIndex = subheaderIndex

      // Make the links container a drop target (only in edit mode)
      if (editMode) {
        linksContainer.addEventListener('dragover', function (e) {
          e.preventDefault()
          this.classList.add('drag-over')
        })

        linksContainer.addEventListener('dragleave', function (e) {
          this.classList.remove('drag-over')
        })

        linksContainer.addEventListener('drop', function (e) {
          e.preventDefault()
          this.classList.remove('drag-over')

          const draggedLinkData = JSON.parse(
            e.dataTransfer.getData('text/plain')
          )
          const sourceCategoryIndex = draggedLinkData.categoryIndex
          const sourceSubheaderIndex = draggedLinkData.subheaderIndex
          const linkIndex = draggedLinkData.linkIndex

          const targetCategoryIndex = parseInt(this.dataset.categoryIndex)
          const targetSubheaderIndex = parseInt(this.dataset.subheaderIndex)

          // Move the link
          const linkToMove =
            categories[sourceCategoryIndex].subheaders[sourceSubheaderIndex]
              .links[linkIndex]
          categories[targetCategoryIndex].subheaders[
            targetSubheaderIndex
          ].links.push(linkToMove)

          // Remove from original position
          categories[sourceCategoryIndex].subheaders[
            sourceSubheaderIndex
          ].links.splice(linkIndex, 1)

          // Re-render
          renderCategories(categories)
        })
      }

      subheader.links.forEach((link, linkIndex) => {
        const linkBtn = document.createElement('a')
        linkBtn.href = link.url
        linkBtn.target = '_blank'
        linkBtn.className = `link-btn ${link.class}`
        linkBtn.textContent = link.name

        // Add drag handle (only in edit mode)
        if (editMode) {
          const dragHandle = document.createElement('span')
          dragHandle.className = 'drag-handle show'
          dragHandle.innerHTML = '⋮'
          dragHandle.draggable = true

          // Make the link draggable
          dragHandle.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData(
              'text/plain',
              JSON.stringify({
                categoryIndex: categoryIndex,
                subheaderIndex: subheaderIndex,
                linkIndex: linkIndex,
              })
            )
            linkBtn.classList.add('dragging')

            // Set drag image
            const dragImage = document.createElement('div')
            dragImage.textContent = link.name
            dragImage.style.backgroundColor =
              getComputedStyle(linkBtn).backgroundColor
            dragImage.style.color = 'white'
            dragImage.style.padding = '8px 16px'
            dragImage.style.borderRadius = '8px'
            dragImage.style.width = '200px'
            dragImage.style.textAlign = 'center'
            document.body.appendChild(dragImage)
            e.dataTransfer.setDragImage(dragImage, 80, 20)

            setTimeout(() => {
              document.body.removeChild(dragImage)
            }, 0)
          })

          dragHandle.addEventListener('dragend', function () {
            linkBtn.classList.remove('dragging')
          })

          // Add dropdown menu for link
          const linkDropdown = createDropdownMenu(
            'link',
            categoryIndex,
            subheaderIndex,
            linkIndex
          )
          linkBtn.appendChild(linkDropdown)

          // Add menu button for link
          const linkMenuBtn = document.createElement('span')
          linkMenuBtn.className = 'menu-btn show'
          linkMenuBtn.innerHTML = '⋮'
          linkMenuBtn.style.position = 'absolute'
          linkMenuBtn.style.right = '8px'
          linkMenuBtn.style.top = '50%'
          linkMenuBtn.style.transform = 'translateY(-50%)'
          linkMenuBtn.style.cursor = 'pointer'
          linkMenuBtn.onclick = function (e) {
            toggleLinkMenu(e, categoryIndex, subheaderIndex, linkIndex)
          }

          linkBtn.appendChild(linkMenuBtn)
        }

        linksContainer.appendChild(linkBtn)
      })

      categoryCard.appendChild(linksContainer)
    })
    if (container) {
      container.appendChild(categoryCard)
    }
  })
}

// Toggle dropdown menus
function toggleCategoryMenu (event, categoryIndex) {
  event.stopPropagation()
  const dropdown = event.target.nextElementSibling
  if (dropdown && dropdown.classList.contains('dropdown-menu')) {
    dropdown.classList.toggle('show')
  }
}

function toggleSubheaderMenu (event, categoryIndex, subheaderIndex) {
  event.stopPropagation()
  const dropdown = event.target.nextElementSibling
  if (dropdown && dropdown.classList.contains('dropdown-menu')) {
    dropdown.classList.toggle('show')
  }
}

function toggleLinkMenu (event, categoryIndex, subheaderIndex, linkIndex) {
  event.stopPropagation()
  const dropdown = event.target.previousElementSibling
  if (dropdown && dropdown.classList.contains('dropdown-menu')) {
    dropdown.classList.toggle('show')
  }
}

// Initial render
renderCategories(categories)

// Search functionality
const searchInput = document.getElementById('searchInput')
if (searchInput)
  searchInput.addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase()

    if (searchTerm === '') {
      renderCategories(categories)
      return
    }

    const filteredCategories = categories
      .map(category => {
        // Filter subheaders based on search term
        const filteredSubheaders = category.subheaders
          .map(subheader => {
            return {
              ...subheader,
              links: subheader.links.filter(
                link =>
                  link.name.toLowerCase().includes(searchTerm) ||
                  subheader.title.toLowerCase().includes(searchTerm)
              ),
            }
          })
          .filter(
            subheader =>
              subheader.links.length > 0 ||
              subheader.title.toLowerCase().includes(searchTerm) ||
              category.name.toLowerCase().includes(searchTerm)
          )

        return {
          ...category,
          subheaders: filteredSubheaders,
        }
      })
      .filter(category => category.subheaders.length > 0)

    renderCategories(filteredCategories)
  })

// Modal functions
function openModal (modalId) {
  document.getElementById(modalId).style.display = 'flex'
}

function closeModal (modalId) {
  document.getElementById(modalId).style.display = 'none'
}

function openAddSubheaderModal (categoryIndex) {
  document.getElementById('categoryIndex').value = categoryIndex
  openModal('addSubheaderModal')
}

function openAddLinkModal (categoryIndex, subheaderIndex) {
  document.getElementById('linkCategoryIndex').value = categoryIndex
  document.getElementById('linkSubheaderIndex').value = subheaderIndex
  openModal('addLinkModal')
}

function openEditCategoryModal (categoryIndex) {
  document.getElementById('editCategoryIndex').value = categoryIndex
  document.getElementById('editCategoryName').value =
    categories[categoryIndex].name
  document.getElementById('editCategoryIcon').value =
    categories[categoryIndex].icon
  openModal('editCategoryModal')
}

function openEditSubheaderModal (categoryIndex, subheaderIndex) {
  document.getElementById('editCategoryIndexSub').value = categoryIndex
  document.getElementById('editSubheaderIndex').value = subheaderIndex
  document.getElementById('editSubheaderName').value =
    categories[categoryIndex].subheaders[subheaderIndex].title
  openModal('editSubheaderModal')
}

function openEditLinkModal (categoryIndex, subheaderIndex, linkIndex) {
  document.getElementById('editLinkCategoryIndex').value = categoryIndex
  document.getElementById('editLinkSubheaderIndex').value = subheaderIndex
  document.getElementById('editLinkIndex').value = linkIndex
  document.getElementById('editLinkName').value =
    categories[categoryIndex].subheaders[subheaderIndex].links[linkIndex].name
  document.getElementById('editLinkUrl').value =
    categories[categoryIndex].subheaders[subheaderIndex].links[linkIndex].url
  document.getElementById('editLinkColor').value =
    categories[categoryIndex].subheaders[subheaderIndex].links[linkIndex].class
  openModal('editLinkModal')
}

// Delete functions
function deleteCategory (categoryIndex) {
  if (
    confirm(
      'Are you sure you want to delete this category and all its contents?'
    )
  ) {
    categories.splice(categoryIndex, 1)
    renderCategories(categories)
  }
}

function deleteSubheader (categoryIndex, subheaderIndex) {
  if (
    confirm('Are you sure you want to delete this subheader and all its links?')
  ) {
    categories[categoryIndex].subheaders.splice(subheaderIndex, 1)
    renderCategories(categories)
  }
}

function deleteLink (categoryIndex, subheaderIndex, linkIndex) {
  if (confirm('Are you sure you want to delete this link?')) {
    categories[categoryIndex].subheaders[subheaderIndex].links.splice(
      linkIndex,
      1
    )
    renderCategories(categories)
  }
}

// Form submissions
const addCategoryForm = document.getElementById('addCategoryForm')
if (addCategoryForm)
  addCategoryForm.addEventListener('submit', function (e) {
    e.preventDefault()

    const categoryName = document.getElementById('categoryName').value
    const categoryIcon = document.getElementById('categoryIcon').value

    categories.push({
      name: categoryName,
      icon: categoryIcon,
      subheaders: [],
    })

    renderCategories(categories)
    closeModal('addCategoryModal')
    this.reset()
  })

const addSubheaderForm = document.getElementById('addSubheaderForm')
if (addSubheaderForm)
  addSubheaderForm.addEventListener('submit', function (e) {
    e.preventDefault()

    const categoryIndex = parseInt(
      document.getElementById('categoryIndex').value
    )
    const subheaderName = document.getElementById('subheaderName').value

    if (!categories[categoryIndex].subheaders) {
      categories[categoryIndex].subheaders = []
    }

    categories[categoryIndex].subheaders.push({
      title: subheaderName,
      links: [],
    })

    renderCategories(categories)
    closeModal('addSubheaderModal')
    this.reset()
  })

const addLinkForm = document.getElementById('addLinkForm')
if (addLinkForm)
  addLinkForm.addEventListener('submit', function (e) {
    e.preventDefault()

    const categoryIndex = parseInt(
      document.getElementById('linkCategoryIndex').value
    )
    const subheaderIndex = parseInt(
      document.getElementById('linkSubheaderIndex').value
    )
    const linkName = document.getElementById('linkName').value
    const linkUrl = document.getElementById('linkUrl').value
    const linkColor = document.getElementById('linkColor').value

    categories[categoryIndex].subheaders[subheaderIndex].links.push({
      name: linkName,
      url: linkUrl,
      class: linkColor,
    })

    renderCategories(categories)
    closeModal('addLinkModal')
    this.reset()
  })

const editCategoryForm = document.getElementById('editCategoryForm')
if (editCategoryForm)
  editCategoryForm.addEventListener('submit', function (e) {
    e.preventDefault()

    const categoryIndex = parseInt(
      document.getElementById('editCategoryIndex').value
    )
    const categoryName = document.getElementById('editCategoryName').value
    const categoryIcon = document.getElementById('editCategoryIcon').value

    categories[categoryIndex].name = categoryName
    categories[categoryIndex].icon = categoryIcon

    renderCategories(categories)
    closeModal('editCategoryModal')
    this.reset()
  })

const editSubheaderForm = document.getElementById('editSubheaderForm')
if (editSubheaderForm)
  editSubheaderForm.addEventListener('submit', function (e) {
    e.preventDefault()

    const categoryIndex = parseInt(
      document.getElementById('editCategoryIndexSub').value
    )
    const subheaderIndex = parseInt(
      document.getElementById('editSubheaderIndex').value
    )
    const subheaderName = document.getElementById('editSubheaderName').value

    categories[categoryIndex].subheaders[subheaderIndex].title = subheaderName

    renderCategories(categories)
    closeModal('editSubheaderModal')
    this.reset()
  })

const editLinkForm = document.getElementById('editLinkForm')
if (editLinkForm)
  editLinkForm.addEventListener('submit', function (e) {
    e.preventDefault()

    const categoryIndex = parseInt(
      document.getElementById('editLinkCategoryIndex').value
    )
    const subheaderIndex = parseInt(
      document.getElementById('editLinkSubheaderIndex').value
    )
    const linkIndex = parseInt(document.getElementById('editLinkIndex').value)
    const linkName = document.getElementById('editLinkName').value
    const linkUrl = document.getElementById('editLinkUrl').value
    const linkColor = document.getElementById('editLinkColor').value

    categories[categoryIndex].subheaders[subheaderIndex].links[linkIndex].name =
      linkName
    categories[categoryIndex].subheaders[subheaderIndex].links[linkIndex].url =
      linkUrl
    categories[categoryIndex].subheaders[subheaderIndex].links[
      linkIndex
    ].class = linkColor

    renderCategories(categories)
    closeModal('editLinkModal')
    this.reset()
  })

// Close modals when clicking outside
window.addEventListener('click', function (event) {
  const modals = document.querySelectorAll('.modal')
  modals.forEach(modal => {
    if (event.target === modal) {
      modal.style.display = 'none'
    }
  })
})

// Add event listener for the floating add category button
const addCategoryBtn = document.getElementById('addCategoryBtn')
if (addCategoryBtn)
  addCategoryBtn.addEventListener('click', function () {
    openModal('addCategoryModal')
  })
