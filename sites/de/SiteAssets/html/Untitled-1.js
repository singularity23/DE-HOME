//-------------------------------------------------------------
//-----------------Do not edit the XML tags--------------------
//-------------------------------------------------------------

//<Document-Level>
//<ACRO_source>ClearFieldsScript</ACRO_source>
//<ACRO_script>
/*********** belongs to: Document-Level:ClearFieldsScript ***********/
var PRfields = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10"];
var Cfields = ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11"];
var SCfields = ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12"];
var DSfields = ["2.1", "2.2", "2.3", "2.4", "2.5"]
var dropdownRisk = this.getField("Dropdown.risk"); 
var notHighRisk = this.getField("1.11");
var POR = this.getField("1.12");
var signatureTL = this.getField("Signature - TL");
var signatureC = this.getField("Signature - Checker");
var signaturePR = this.getField("Signature - Peer Reviewer");
var dateTL = this.getField("Date - TL_af_date");
var dateC = this.getField("Date - Checker_af_date");
var datePR = this.getField("Date - Peer Reviewer_af_date");
var C = this.getField("Checker1");
var R = this.getField("Assigned Type 1 Reviewer Name");
var PR = this.getField("Peer Reviewer Name");
var layers = this.getOCGs();
var structwarning = this.getField("Structural Warning");
var notlowriskwarning = this.getField("Not Low Risk Warning");
var low = this.getField("Risk - Low");
var medium = this.getField("Risk - Medium");
var high = this.getField("Risk - High");
var risk = this.getField("Risk")
var Reset2 = this.getField("Reset2");
var riskwarning = this.getField("High Risk Warning");
var blocker = this.getField("blocker");

// Arrays to track visibility states
var visibilityStates = {
    signatureC: [0, 0, 0, 0, 0, 0, 0],
    dateC: [0, 0, 0, 0, 0, 0, 0],
    C: [0, 0, 0, 0, 0, 0, 0],
    signatureTL: [0, 0, 0, 0, 0, 0, 0],
    dateTL: [0, 0, 0, 0, 0, 0, 0],
    R: [0, 0, 0, 0, 0, 0, 0],
    signaturePR: [0, 0, 0, 0, 0, 0, 0],
    datePR: [0, 0, 0, 0, 0, 0, 0],
    PR: [0, 0, 0, 0, 0, 0, 0],
    structwarning: [0, 0, 0, 0, 0, 0, 0],
    low: [0, 0, 0, 0, 0, 0, 0],
    medium: [0, 0, 0, 0, 0, 0, 0],
    high: [0, 0, 0, 0, 0, 0, 0],
    riskwarning: [0, 0, 0, 0, 0, 0, 0],
};

// Utility to clear fields
function clearFields(fieldArray) {
    fieldArray.forEach(function(fieldName) {
        var field = this.getField(fieldName);
        if (field) field.value = ""; // Clear the field value
    }, this);
}


// Function to handle high-risk logic
function highRisk() {
    var index = 0; // Index for high-risk logic
    if (notHighRisk.value === "No") {
        visibilityStates.signatureC[index] = 1;
        visibilityStates.dateC[index] = 1;
        visibilityStates.C[index] = 1;
        visibilityStates.signatureTL[index] = 1;
        visibilityStates.dateTL[index] = 1;
        visibilityStates.R[index] = 1;
    } else {
        visibilityStates.signatureC[index] = 0;
        visibilityStates.dateC[index] = 0;
        visibilityStates.C[index] = 0;
        visibilityStates.signatureTL[index] = 0;
        visibilityStates.dateTL[index] = 0;
        visibilityStates.R[index] = 0;
    }
    updateFieldVisibility();
}

// Function to handle 1.9 logic
function notlowrisk() {
    var index = 1; // Index for notlowrisk logic
    var notlowrisk = this.getField("1.9");

    if (notlowrisk.value === "No") {
        visibilityStates.signatureC[index] = 1;
        visibilityStates.dateC[index] = 1;
        visibilityStates.C[index] = 1;
    } else {
        visibilityStates.signatureC[index] = 0;
        visibilityStates.dateC[index] = 0;
        visibilityStates.C[index] = 0;
    }
    updateFieldVisibility();
}

// Function to handle structural logic
function structural() {
    var index = 2; // Index for warning logic
    var notstruct = this.getField("1.10");

    if (notstruct.value === "No") {
        visibilityStates.structwarning[index] = 1;
    } else {
        visibilityStates.structwarning[index] = 0;
    }
    updateFieldVisibility();
}

// Function to compare selected risk value vs 1.11
function riskwarningfcn() {
    var index = 2; // Index for warning logic
var notHighRisk = this.getField("1.11");
var risk = this.getField("Risk")
    if (notHighRisk.value === "No" && risk.value === "High") {
        visibilityStates.riskwarning[index] = 0;
    } else if (notHighRisk.value === "Yes" && risk.value !== "High") {
        visibilityStates.riskwarning[index] = 0;
    } else {
        visibilityStates.riskwarning[index] = 1;
    }
    updateFieldVisibility();
}



// Function to handle POR logic
function toggleVisibilityBasedOnPOR() {
    var index = 3; // Index for POR logic


    // Handle fields visibility based on POR value
    var fieldsToHide = ["2.1", "2.2", "2.3", "2.4", "2.5"];
    var fieldsToShow = ["2.1", "2.2", "2.3", "2.4", "2.5"];

    if (POR.value === "Yes") {
        fieldsToHide.forEach(function(fieldName) {
            var field = this.getField(fieldName);
            if (field) {
                field.display = display.hidden;
                visibilityStates.signatureC[index] = 0;
                visibilityStates.dateC[index] = 0;
                visibilityStates.C[index] = 0;
		Reset2.display = display.hidden;
		blocker.display = display.visible;
            }
        }, this);
    } else if (POR.value === "No") {
        fieldsToShow.forEach(function(fieldName) {
            var field = this.getField(fieldName);
            if (field) {
                field.display = display.visible;
                visibilityStates.signatureC[index] = 1;
                visibilityStates.dateC[index] = 1;
                visibilityStates.C[index] = 1;
		Reset2.display = display.visible;
		blocker.display = display.hidden;
            }
        }, this);
    }
    updateFieldVisibility();
}

function Risk() {
    var index = 4; // Index for risk logic
    // Now, handle visibility and other logic based on dropdown selection
    if (risk.value === "High") {
        visibilityStates.signatureC[index] = 1;
        visibilityStates.dateC[index] = 1;
        visibilityStates.C[index] = 1;
        visibilityStates.signatureTL[index] = 1;
        visibilityStates.dateTL[index] = 1;
        visibilityStates.R[index] = 1;
	visibilityStates.low[index] = 0;
	visibilityStates.medium[index] = 0;
	visibilityStates.high[index] = 1;
    } else if (risk.value === "Medium") {
        visibilityStates.signatureC[index] = 1;
        visibilityStates.dateC[index] = 1;
        visibilityStates.C[index] = 1;
        visibilityStates.signatureTL[index] = 0;
        visibilityStates.dateTL[index] = 0;
        visibilityStates.R[index] = 0;
	visibilityStates.low[index] = 0;
	visibilityStates.medium[index] = 1;
	visibilityStates.high[index] = 0;
    } else if (risk.value === "Low") {
        visibilityStates.signatureC[index] = 0;
        visibilityStates.dateC[index] = 0;
        visibilityStates.C[index] = 0;
        visibilityStates.signatureTL[index] = 0;
        visibilityStates.dateTL[index] = 0;
        visibilityStates.R[index] = 0;
	visibilityStates.low[index] = 1;
	visibilityStates.medium[index] = 0;
	visibilityStates.high[index] = 0;
    } else {
        visibilityStates.signatureC[index] = 0;
        visibilityStates.dateC[index] = 0;
        visibilityStates.C[index] = 0;
        visibilityStates.signatureTL[index] = 0;
        visibilityStates.dateTL[index] = 0;
        visibilityStates.R[index] = 0;
	visibilityStates.low[index] = 0;
	visibilityStates.medium[index] = 0;
	visibilityStates.high[index] = 0;
    }

    updateFieldVisibility();

}

function radioboxes() {
    var index = 5;
    var isAnyPRFieldSelected = PRfields.some(function(name) {
        var radioButton = this.getField(name);
        return radioButton && radioButton.value !== false; // Check if the radio button is selected
    }, this);

    if (isAnyPRFieldSelected) {
        visibilityStates.signaturePR[index] = 1;
        visibilityStates.datePR[index] = 1;
        visibilityStates.PR[index] = 1;
    } else {
        visibilityStates.signaturePR[index] = 0;
        visibilityStates.datePR[index] = 0;
        visibilityStates.PR[index] = 0;
    }

    var isAnyCFieldSelected = Cfields.some(function(name) {
        var radioButton = this.getField(name);
        return radioButton && radioButton.value !== false; // Check if the radio button is selected
    }, this);

    if (isAnyCFieldSelected) {
        visibilityStates.signatureC[index] = 1;
        visibilityStates.dateC[index] = 1;
        visibilityStates.C[index] = 1;
    } else {
        visibilityStates.signatureC[index] = 0;
        visibilityStates.dateC[index] = 0;
        visibilityStates.C[index] = 0;
    }

    updateFieldVisibility();
}

function displayFunc(a, b) {
    return a + b;
}

// Central function to update visibility based on arrays
function updateFieldVisibility() {

    // Sum the values in the arrays to determine visibility
    signatureC.display = visibilityStates.signatureC.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    dateC.display = visibilityStates.dateC.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    C.display = visibilityStates.C.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    signatureTL.display = visibilityStates.signatureTL.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    dateTL.display = visibilityStates.dateTL.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    R.display = visibilityStates.R.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    signaturePR.display = visibilityStates.signaturePR.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    datePR.display = visibilityStates.datePR.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    PR.display = visibilityStates.PR.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    structwarning.display = visibilityStates.structwarning.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    low.display = visibilityStates.low.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    medium.display = visibilityStates.medium.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    high.display = visibilityStates.high.reduce(displayFunc) > 0 ? display.visible : display.hidden;
    riskwarning.display = visibilityStates.riskwarning.reduce(displayFunc) > 0 ? display.visible : display.hidden;
printDebugInfo();

}



function recalculateVisibilityStates() {
    // Reset all arrays to 0
    for (var key in visibilityStates) {
        if (visibilityStates.hasOwnProperty(key)) {
            visibilityStates[key] = visibilityStates[key].map(() => 0);
        }
    }
    // Add more conditions if other fields affect visibility

    updateFieldVisibility();
}


// Function to clear entire form
function clearForm() {
 
  	recalculateVisibilityStates();

	clearRadioButtons([PRfields, Cfields, SCfields,DSfields]);
	risk.value = false;
	
	low.display = display.hidden;
	medium.display = display.hidden;
	high.display = display.hidden;
	signatureC.display = display.hidden;
    	dateC.display = display.hidden;
    	C.display = display.hidden;
    	signatureTL.display = display.hidden;
    	dateTL.display = display.hidden;
   	R.display = display.hidden;
    	signaturePR.display = display.hidden;
    	datePR.display = display.hidden;
    	PR.display = display.hidden;
    	structwarning.display = display.hidden;
	Reset2.display = display.hidden;
	riskwarning.display = display.hidden;
	blocker.display = display.visible;
	hideDS();

	updateFieldVisiblity();


printDebugInfo();
}

function clearRadioButtons(fieldArrays) {
    fieldArrays.forEach(function(fieldArray) {
        fieldArray.forEach(function(name) {
            var radioButton = this.getField(name);
            if (radioButton) {
                radioButton.value = false; // Clear the radio button
            }
        }, this);
    }, this);
}

function hideDS() {
    // Iterate through all layers and hide the layer named "Block"
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].name === "Block") {
            layers[i].state = 1; // Hide the "Block" layer (state = 1 hides it)
        }
    }

    // Define fields to hide (the ones that have the names like "2.1", "2.2", etc.)
    var fieldsToHide = ["2.1", "2.2", "2.3", "2.4", "2.5"];

    // Loop through each of the fields and hide them
    fieldsToHide.forEach(function(fieldName) {
        var field = this.getField(fieldName);
        if (field) {
            field.display = display.hidden; // Set display to hidden
        }
    }, this);
    
    // Ensure Reset2 field is also hidden, if necessary
    var reset2Field = this.getField("Reset2");
    if (reset2Field) {
        reset2Field.display = display.hidden; // Hide Reset2 field
    }
}


// Function to clear PR fields
function clearPRfields() {
    clearFields(PRfields);

        visibilityStates.signaturePR[5] = 0;
        visibilityStates.datePR[5] = 0;
        visibilityStates.PR[5] = 0;


    updateFieldVisibility();
}

// Function to clear C fields
function clearCfields() {
    clearFields(Cfields);


        visibilityStates.signatureC[5] = 0;
        visibilityStates.dateC[5] = 0;
        visibilityStates.C[5] = 0;

	updateFieldVisibility();
}


// Function to clear DS fields
function clearDSfields() {
    clearFields(DSfields);
	updateFieldVisibility();
}


// Function to clear SC fields
function clearSCfields() {
    clearFields(SCfields);
                visibilityStates.signatureC[3] = 0;
                visibilityStates.dateC[3] = 0;
                visibilityStates.C[3] = 0;
	visibilityStates.structwarning[2] = 0;
        visibilityStates.signatureC[0] = 0;
        visibilityStates.dateC[0] = 0;
        visibilityStates.C[0] = 0;
        visibilityStates.signatureTL[0] = 0;
        visibilityStates.dateTL[0] = 0;
        visibilityStates.R[0] = 0;
        visibilityStates.signatureC[1] = 0;
        visibilityStates.dateC[1] = 0;
        visibilityStates.C[1] = 0;
	hideDS();
	blocker.display = display.visible;
	updateFieldVisibility();
}


function printDebugInfo() {
    var debugField = this.getField("DebugOutput"); // Get the debug text field
    if (debugField) {
        var debugText = "";

        for (var key in visibilityStates) {
            if (visibilityStates.hasOwnProperty(key)) {
                debugText += key + ": [" + visibilityStates[key].join(", ") + "]\n";
            }
        }

        debugField.value = debugText; // Print array values into the debug text box
    }
}


// Document-level JavaScript (runs on file open)
function onOpen() {
    toggleVisibilityBasedOnPOR(); // Re-check the POR value and adjust layer visibility
}

//</ACRO_script>
//</Document-Level>

//<AcroForm>
//<ACRO_source>1.10:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.10:Annot1:MouseUp:Action1 ***********/
structural();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.10:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.10:Annot2:MouseUp:Action1 ***********/
structural();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.11:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.11:Annot1:MouseUp:Action1 ***********/
highRisk();
riskwarningfcn();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.11:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.11:Annot2:MouseUp:Action1 ***********/
highRisk();
riskwarningfcn();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.12:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.12:Annot1:MouseUp:Action1 ***********/
toggleVisibilityBasedOnPOR()
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.12:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.12:Annot2:MouseUp:Action1 ***********/
toggleVisibilityBasedOnPOR()
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.9:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.9:Annot1:MouseUp:Action1 ***********/
notlowrisk()
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>1.9:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:1.9:Annot2:MouseUp:Action1 ***********/
notlowrisk()
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.1:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.1:Annot1:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.1:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.1:Annot2:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.1:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.1:Annot3:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.2:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.2:Annot1:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.2:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.2:Annot2:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.2:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.2:Annot3:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.3:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.3:Annot1:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.3:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.3:Annot2:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.3:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.3:Annot3:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.4:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.4:Annot1:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.4:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.4:Annot2:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.4:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.4:Annot3:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.5:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.5:Annot1:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.5:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.5:Annot2:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>2.5:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:2.5:Annot3:MouseUp:Action1 ***********/
var reset = getField("Reset#2");
reset.display = display.visible;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.1:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.1:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.1:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.1:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.10:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.10:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.10:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.10:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.10:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.10:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.11:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.11:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.11:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.11:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.11:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.11:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.2:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.2:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.2:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.2:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.2:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.2:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.3:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.3:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.3:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.3:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.3:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.3:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.4:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.4:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.4:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.4:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.4:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.4:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.5:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.5:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.5:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.5:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.5:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.5:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.6:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.6:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.6:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.6:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.6:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.6:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.7:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.7:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.7:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.7:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.7:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.7:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.8:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.8:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.8:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.8:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.8:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.8:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.9:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.9:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.9:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.9:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>3.9:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:3.9:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.1:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.1:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.1:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.1:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.1:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.1:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.10:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.10:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.10:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.10:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.10:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.10:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.2:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.2:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.2:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.2:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.2:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.2:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.3:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.3:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.3:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.3:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.3:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.3:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.4:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.4:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.4:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.4:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.4:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.4:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.5:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.5:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.5:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.5:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.5:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.5:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.6:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.6:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.6:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.6:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.6:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.6:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.7:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.7:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.7:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.7:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.7:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.7:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.8:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.8:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.8:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.8:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.8:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.8:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.9:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.9:Annot1:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.9:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.9:Annot2:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>4.9:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:4.9:Annot3:MouseUp:Action1 ***********/
radioboxes();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Checker:Keystroke</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Checker:Keystroke ***********/
event.changeEx = event.value;
this.getField("Checker1").value = event.value;
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Reset:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Reset:Annot1:MouseUp:Action1 ***********/
clearForm();

//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Reset1:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Reset1:Annot1:MouseUp:Action1 ***********/
clearSCfields();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Reset2:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Reset2:Annot1:MouseUp:Action1 ***********/
clearDSfields()
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Reset3:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Reset3:Annot1:MouseUp:Action1 ***********/
clearCfields()
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Reset4:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Reset4:Annot1:MouseUp:Action1 ***********/
clearPRfields();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Risk:Annot1:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Risk:Annot1:MouseUp:Action1 ***********/
Risk();
riskwarningfcn();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Risk:Annot2:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Risk:Annot2:MouseUp:Action1 ***********/
Risk();
riskwarningfcn();
//</ACRO_script>
//</AcroForm>

//<AcroForm>
//<ACRO_source>Risk:Annot3:MouseUp:Action1</ACRO_source>
//<ACRO_script>
/*********** belongs to: AcroForm:Risk:Annot3:MouseUp:Action1 ***********/
Risk();
riskwarningfcn();
//</ACRO_script>
//</AcroForm>


