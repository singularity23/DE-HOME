# CSS Usage Analysis Report
==================================================

## Summary

### default.css
- Total selectors: 62
- Used selectors: 11 (17.7%)
- Unused selectors: 51

### default2.css
- Total selectors: 55
- Used selectors: 31 (56.4%)
- Unused selectors: 24

## Unused Selectors

### default.css - 51 unused selectors

#### Classes
- `.box_head`
- `.cell-margin.tableCol-25 .ms-webpart-zone.ms-fullWidth`
- `.center-text`
- `.dev`
- `.material-symbols-outlined`
- `.ms-core-listMenu-item`
- `.ms-core-listMenu-item:link`
- `.ms-core-listMenu-item:visited`
- `.ms-core-navigation`
- `.ms-fullWidth`
- `.ms-fullscreenmode #sideNavBox`
- `.ms-tv-header:link`
- `.ms-tv-header:visited`
- `.ms-tv-item:link`
- `.ms-tv-item:visited`

#### IDs
- `#DeltaPlaceHolderPageTitleInTitleArea`
- `#MSOZoneCell_WebPartWPQ3 .ms-alternating.ms-newsletteralt`
- `#MSOZoneCell_WebPartWPQ3 h2.ms-webpart-titleText>a`
- `#MSOZoneCell_WebPartWPQ3>div.ms-webpart-chrome.ms-webpart-chrome-vertical.ms-webpart-chrome-fullWidth`
- `#MSOZoneCell_WebPartWPQ3>div.ms-webpart-chrome.ms-webpart-chrome-vertical.ms-webpart-chrome-fullWidth:hover`
- `#WebPartWPQ3`
- `#contentBox`
- `#s4-bodyContainer`
- `#sideNavBox`

#### Tags
- `abbr`

#### Pseudo-classes
- `:root`
- `div.sidebar:hover`

#### Pseudo-elements
- `*::after`
- `*::before`
- `div.sidebar a::after`

#### Other
- `*`
- `div#MSOZoneCell_WebPartWPQ3`
- `div#MSOZoneCell_WebPartWPQ4`
- `div#MSOZoneCell_WebPartWPQ6`
- `div#MSOZoneCell_WebPartWPQ7`
- `div#s4-workspace`
- `div.dummy-bottom`
- `div.dummy-top`
- `div.feedback`
- `div.feedback-head`
- `div.feedback-info`
- `div.popup`
- `div.popup-content`
- `div.popup-head`
- `div.popup.show`
- `div.right-section`
- `div.sidebar`
- `h1.box_text`
- `h2.ms-webpart-titleText`
- `td.ms-vb`
... and 1 more

### default2.css - 24 unused selectors

#### Classes
- `.grid-container`
- `.item`
- `.link-info`
- `.link-info:hover`
- `.links .grid-container`
- `.links .grid-container:last-child`
- `.links .item`
- `.links .special`
- `.links dd .link-title`
- `.links dd .nogo .link-title:hover`
- `.links dd .sub-link`
- `.links dd .sub-link a::before`
- `.links dt a.nogo:hover`
- `.links.panel`
- `.links.panel:hover`
- `.panel-body`
- `.panel-heading`
- `.special`

#### IDs
- `#MSOZoneCell_WebPartWPQ7`

#### Tags
- `from`
- `to`

#### Pseudo-classes
- `:root`

#### Other
- `@font-face`
- `h1.box_text`

## HTML Elements Found

Total unique elements: 618

### Tags
- `Administrative`
- `DEcontainer`
- `DEhome`
- `Form1`
- `LG`
- `LL`
- `LLG`
- `LLL`
- `POR`
- `POR2`
- `R0`
- `R1`
- `Section1`
- `Section2`
- `Section3`
... and 267 more

### Classes
- `.DEcontainer`
- `.DEhome`
- `.Menu_DateTime`
- `.Section2`
- `.Section3`
- `.add-category-btn`
- `.align-bottom`
- `.align-top`
- `.aspNetDisabled`
- `.aspNetHidden`
- `.bar`
- `.bg-blue`
- `.bg-facebook`
- `.bg-github`
- `.bg-google`
... and 111 more

### IDs
- `#Administrative`
- `#DEcontainer`
- `#Form1`
- `#LG`
- `#LL`
- `#LLG`
- `#LLL`
- `#POR`
- `#POR2`
- `#R0`
- `#R1`
- `#Section1`
- `#Section2`
- `#Section3`
- `#UctlHeader1_lblDateTime`
... and 151 more

### Other
- `Menu_DateTime`
- `UctlHeader1_lblDateTime`
- `UctlHeader1_lbl_Menu_Application_Name`
- `UctlHeader1_mnuBCHXHeader`
- `UctlHeader1_mnuBCHXHeader_ContextData`
- `__EVENTARGUMENT`
- `__EVENTTARGET`
- `__EVENTVALIDATION`
- `__LASTFOCUS`
- `__VIEWSTATE`
- `__VIEWSTATEGENERATOR`
- `btn-grp__item`
- `customer_name`
- `ddl_ExportType`
- `equipment_id`
... and 29 more

## Recommendations

### For CSS Optimization
- **default.css**: Only 17.7% of selectors are used. Consider removing unused selectors.
- **default2.css**: 56.4% usage is acceptable but could be optimized.

### Unused Selector Categories
#### default.css
- Utility classes: 1 selectors
- Layout classes: 6 selectors
- Typography classes: 3 selectors
- Color classes: 0 selectors
- Spacing classes: 3 selectors
- Component classes: 6 selectors
- State classes: 4 selectors
- Pseudo-selectors: 3 selectors
- Media queries: 0 selectors
- Keyframes: 0 selectors
- Other: 25 selectors

#### default2.css
- Utility classes: 0 selectors
- Layout classes: 4 selectors
- Typography classes: 4 selectors
- Color classes: 0 selectors
- Spacing classes: 0 selectors
- Component classes: 9 selectors
- State classes: 0 selectors
- Pseudo-selectors: 0 selectors
- Media queries: 0 selectors
- Keyframes: 0 selectors
- Other: 7 selectors
