CTPS = {};
CTPS.lrtpOD = {};
CTPS.lrtpOD.map = {};
CTPS.lrtpOD.tabs = {};
CTPS.lrtpOD.myData = [];
CTPS.lrtpOD.myDataOrigins = [];
CTPS.lrtpOD.myDataDestinations = [];
CSSClass = {};

CTPS.lrtpOD.mapCenter = [232592.43833705207, 893760.2746035221];
CTPS.lrtpOD.mapZoom = 3.0;


// CTPS.lrtpOD.szServerRoot  = 'http://www.ctps.org:8080/geoserver/'; 
CTPS.lrtpOD.szServerRoot  = location.protocol + '//' + location.hostname + '/maploc/'; 
CTPS.lrtpOD.szWMSserverRoot = CTPS.lrtpOD.szServerRoot + '/wms'; 
CTPS.lrtpOD.szWFSserverRoot = CTPS.lrtpOD.szServerRoot + '/wfs';

// VARIABLES FOR FREQUENTLY USED LAYER FILES
var ne_states = 'postgis:mgis_nemask_poly';

var towns_base = 'postgis:dest2040_towns_modelarea';
var OD_districts = 'postgis:dest2040_districts_sm_circles';
var roadways = 'postgis:ctps_roadinventory_grouped';			
var trips_crosstab = 'postgis:dest2040_od_hway_2016';      	// Default: just a placeholder
var MA_mask = 'postgis:ctps_ma_wo_model_area';
var current_mode = 'AUTO';
var year = '';

// Global store of O/D data read from CSV sources
var OD_DATA = { 'hway_2016'     : null, 
                'hway_2040'     : null,
                'bikewalk_2016' : null,
                'bikewalk_2040' : null,
                'transit_2016'  : null, 
                'transit_2040'  : null,
                'trucks_2016'    : null,
                'trucks_2040'   : null
};

//	Vector Layer Style Functions
CTPS.lrtpOD.styleOrigin = function(feature) {
	var fill;
	var stroke;
	var district_num = feature.get("district_num");
	var trips;
	for (var i=0; i<CTPS.lrtpOD.myDataOrigins.length; i++){
		if (CTPS.lrtpOD.myDataOrigins[i][1] === district_num){
			trips = CTPS.lrtpOD.myDataOrigins[i][2];
		};
	};
	if (trips >= 50000) {
		fill = 'rgba(0,51,255,0.6)';
		stroke = 'rgba(0,255,0,0.3)';
	} else if (trips >=10000 && trips < 50000){
		fill = 'rgba(0,102,255,0.4)';
		stroke = 'rgba(0,255,0,0.3)';
	} else if (trips >=5000 && trips < 10000){
		fill = 'rgba(51,204,255,0.3)';
		stroke = 'rgba(0,255,0,0.3)';
	} else {
		fill = 'rgba(0,0,0,0)';
		stroke = 'rgba(0,0,0,0)';
	};
	return [new ol.style.Style({
		fill	: new ol.style.Fill({ 
					color: fill
				}), 
		stroke 	: new ol.style.Stroke({ 
					color: stroke,
					width: 0.2
				})
	})];
};

CTPS.lrtpOD.styleDestination = function(feature) {
	var fill;
	var stroke;
	var district_num = feature.get("district_num");
	var trips;
	for (var i=0; i<CTPS.lrtpOD.myDataDestinations.length; i++){
		if (CTPS.lrtpOD.myDataDestinations[i][1] === district_num){
			trips = CTPS.lrtpOD.myDataDestinations[i][2];
		};
	};
	if (trips >= 50000) {
		fill = 'rgba(255,51,255,0.6)';
		stroke = 'rgba(0,255,0,0.3)';
	} else if (trips >=10000 && trips < 50000){
		fill = 'rgba(153,51,102,0.4)';
		stroke = 'rgba(0,255,0,0.3)';
	} else if (trips >=5000 && trips < 10000){
		fill = 'rgba(255,153,204,0.3)';
		stroke = 'rgba(0,255,0,0.3)';
	} else {
		fill = 'rgba(0,0,0,0)';
		stroke = 'rgba(0,0,0,0)';
	};
	return [new ol.style.Style({
		fill	: new ol.style.Fill({ 
					color: fill
				}), 
		stroke 	: new ol.style.Stroke({ 
					color: stroke,
					width: 0.2
				})
	})];
};


/* ****************  1. UTILITY FUNCTIONS  ***************/
// hide/unhide toggle, works in conjunction with class definition in CSS file--
// see below, and see CSS file, for difference between 'unhide' and 'toggle_turn_on' 
function unhide(divID) {
	//function toggles hiding and unhiding a specified Div
	var item = document.getElementById(divID);
	if (item) {
		item.className=(item.className==='hidden')?'unhidden':'hidden';
	}
}; // unhide()

// toggle elements on and off, works in conjunction with class definitions in CSS file
// NOTE: difference from 'unhide' above is that 'unhide' works with 'visibility' CSS; 'toggle..' works with 'display..' CSS
function toggle_turn_on(divID) {
	//function toggles hiding and unhiding a specified Div
	var item = document.getElementById(divID);
	if (item) {
		item.className=(item.className==='turned_off')?'turned_on':'turned_off';
	}
}; // toggle_turn_on()


// turns off 3 vector layers used to display ORIGIN and DESTINATION data; does not turn off 'selected district' layer
function turn_off_vectors(){
    CTPS.lrtpOD.oDistrictVectorLayer.getSource().clear();
};  // turn_off_vectors()

function popup(url) {
    popupWindow = window.open(url,'popUpWindow','height=700,width=600,left=600,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes')
}; // popup()

// END of UTILITY FUNCTIONS


/* ****************  2. INITIALIZE PAGE, DRAW MAP  *****************/

CTPS.lrtpOD.preInit = function() {
    // Load the O/D data tables
    var hway_2016_URL = './data/hway_2016.csv',
        hway_2040_URL = './data/hway_2040.csv',
        bikewalk_2016_URL = './data/bikewalk_2016.csv',
        bikewalk_2040_URL = './data/bikewalk_2040.csv',
        transit_2016_URL = './data/transit_2016.csv',
        transit_2040_URL = './data/transit_2040.csv',
        trucks_2016_URL = './data/trucks_2016.csv',
        trucks_2040_URL = './data/trucks_2040.csv';     

    var q = d3.queue()
                .defer(d3.csv, hway_2016_URL)
                .defer(d3.csv, hway_2040_URL)
                .defer(d3.csv, bikewalk_2016_URL)
                .defer(d3.csv, bikewalk_2040_URL)
                .defer(d3.csv, transit_2016_URL)
                .defer(d3.csv, transit_2040_URL)
                .defer(d3.csv, trucks_2016_URL)
                .defer(d3.csv, trucks_2040_URL)
                .awaitAll(CTPS.lrtpOD.init);
} // preInit()

CTPS.lrtpOD.init = function(error, results){
    if (error != null) {
        alert("One or more requests to load data failed. Exiting application.");
        return;         
    }        
    OD_DATA['hway_2016'] = results[0];
    OD_DATA['hway_2040'] = results[1];
    OD_DATA['bikewalk_2016'] = results[2];   
    OD_DATA['bikewalk_2040'] = results[3];
    OD_DATA['transit_2016'] = results[4];   
    OD_DATA['transit_2040'] = results[5];
    OD_DATA['trucks_2016'] = results[6];   
    OD_DATA['trucks_2040'] = results[7];

    function cleanupCsvRec(rec) {
        rec.table_index = +rec.table_index;
        rec.origins = +rec.origins;
        rec.gd01 = +rec.gd01; rec.gd02 = +rec.gd02; rec.gd03 = +rec.gd03; rec.gd04 = +rec.gd04; rec.gd05 = +rec.gd05;
        rec.gd06 = +rec.gd06; rec.gd07 = +rec.gd07; rec.gd08 = +rec.gd08; rec.gd09 = +rec.gd09; rec.gd10 = +rec.gd10;
        rec.gd11 = +rec.gd11; rec.gd12 = +rec.gd12; rec.gd13 = +rec.gd13; rec.gd14 = +rec.gd14; rec.gd15 = +rec.gd15;
        rec.gd16 = +rec.gd16; rec.gd17 = +rec.gd17; rec.gd18 = +rec.gd18; rec.gd19 = +rec.gd19; rec.gd20 = +rec.gd20;
        rec.gd21 = +rec.gd21; rec.gd22 = +rec.gd22; rec.gd23 = +rec.gd23; rec.gd24 = +rec.gd24; rec.gd25 = +rec.gd25;
        rec.gd26 = +rec.gd26; rec.gd27 = +rec.gd27; rec.gd28 = +rec.gd28; rec.gd29 = +rec.gd29; rec.gd30 = +rec.gd30;
        rec.gd31 = +rec.gd31; rec.gd32 = +rec.gd32; rec.gd33 = +rec.gd33; rec.gd34 = +rec.gd34; rec.gd35 = +rec.gd35;
        rec.gd36 = +rec.gd36; rec.gd37 = +rec.gd37; rec.gd38 = +rec.gd38; rec.gd39 = +rec.gd39; rec.gd40 = +rec.gd40;
        rec.gd41 = +rec.gd41; rec.gd42 = +rec.gd42;
        rec.gd51 = +rec.gd51; rec.gd52 = +rec.gd52; rec.gd53 = +rec.gd53; rec.gd54 = +rec.gd54; rec.gd55 = +rec.gd55;
    } 
    
    OD_DATA['hway_2016'].forEach(cleanupCsvRec);
    OD_DATA['hway_2040'].forEach(cleanupCsvRec);
    OD_DATA['bikewalk_2016'].forEach(cleanupCsvRec);
    OD_DATA['bikewalk_2040'].forEach(cleanupCsvRec);
    OD_DATA['transit_2016'].forEach(cleanupCsvRec);
    OD_DATA['transit_2040'].forEach(cleanupCsvRec);
    OD_DATA['trucks_2016'].forEach(cleanupCsvRec);
    OD_DATA['trucks_2040'].forEach(cleanupCsvRec);
    
    var _DEBUG_HOOK = 0;

    // Populate "select district" combo box.
    var i;        
    var oSelect = document.getElementById("selected_district"); 
    var oOption;  // An <option> to be added to the  <select>.
    for (i = 0; i < MPMUTILS.modelRegions_2012.length; i++) {           
        oOption = document.createElement("OPTION");
        oOption.value = MPMUTILS.modelRegions_2012[i][0];
        oOption.text = MPMUTILS.modelRegions_2012[i][0] + ', ' + MPMUTILS.modelRegions_2012[i][1];        
        oSelect.options.add(oOption);
    };
    
    // Define WMS layers
    var oBaseLayers = new ol.layer.Tile({	
        source: new ol.source.TileWMS({
            url		:  CTPS.lrtpOD.szWMSserverRoot,
            params	: {
                'LAYERS': 	[	ne_states,
                                roadways,
                                MA_mask,
                                OD_districts,
                                towns_base	],
                'STYLES': 	[	'ne_states',
                                'RoadsMultiscaleGroupedBGblue',
                                'non_boston_mpo_gray_mask',
                                'Dest2040_districts_ext_numbers',
                                'Dest2040_towns_OD_boundaries'	],
                'TILED': 	[	'true',
                                'true',
                                'true',
                                'true',
                                'false'	],
                'TRANSPARENT': 	[	'false',
                                    'true',
                                    'true',
                                    'true',
                                    'true'	],
                'IDS' : [	'ne_states',
                            'roadways',
                            'non_boston_mpo_gray_mask',
                            'OD_districts',
                            'towns_base'	]
            }
        })
    }); 	
    
    // Define WFS LAYERS
    CTPS.lrtpOD.oHighlightLayer = new ol.layer.Vector({
        //"Selected District"
        source	: new ol.source.Vector({
            wrapX: false 
        }),
        style	: new ol.style.Style({
            // ALTERNATIVE STYLE FOR 'DISTRICT SELECTION' VECTOR LAYER--HEAVY RED LINE ONLY
            fill	: new ol.style.Fill({ 
                        color: 'rgba(0, 0, 0, 0)'
                    }), 
            stroke 	: new ol.style.Stroke({ 
                        color: "#FF0000",
                        width: 3.0
                    })
        })
    });	
    CTPS.lrtpOD.oDistrictVectorLayer = new ol.layer.Vector({
        //"Origins-Few Trips"
        source	: new ol.source.Vector({
            wrapX: false 
        })
    });
    
    // Define MA State Plane Projection and EPSG:26986/EPSG:4326 transform functions
    // because neither defined by OpenLayers, must be created manually.
    // More on custom projections: 	http://openlayers.org/en/latest/examples/wms-custom-proj.html
    //								http://openlayers.org/en/master/apidoc/ol.proj.Projection.html
    //								https://openlayers.org/en/latest/apidoc/ol.proj.html#.addCoordinateTransforms
    var projection = new ol.proj.Projection({
        code: 'EPSG:26986',
        extent: [33861.26,777514.31,330846.09,1228675.50],	// bounds are MA's minx, miny, maxx, plus NH's maxy
        units: 'm'
    });
    ol.proj.addProjection(projection);
    // proj4js: http://proj4js.org/
    // https://epsg.io/26986#
    var MaStatePlane = '+proj=lcc +lat_1=42.68333333333333 +lat_2=41.71666666666667 +lat_0=41 +lon_0=-71.5 +x_0=200000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    ol.proj.addCoordinateTransforms(
        'EPSG:4326',
        projection,
        function(coordinate){
            var WGS_to_MAState = proj4(MaStatePlane).forward(coordinate);
            return WGS_to_MAState;
        },
        function(coordinate){
            var MAState_to_WGS = proj4(MaStatePlane).inverse(coordinate);
            return MAState_to_WGS;
        }
    );
    
    // Define ol3 Map
    CTPS.lrtpOD.map = new ol.Map({
        target	: 'map2',
        controls: ol.control.defaults().extend([
            new ol.control.ScaleLine({
                units	: 'us'
            })
        ]),
        layers	: [	oBaseLayers,
                    CTPS.lrtpOD.oDistrictVectorLayer,
                    CTPS.lrtpOD.oHighlightLayer	],
        view	: new ol.View({
            projection: projection,
            center	: CTPS.lrtpOD.mapCenter,
            zoom	: CTPS.lrtpOD.mapZoom,
            maxZoom	: 9,
            minZoom	: 2
        })
    });	 
}	//   END OF 'INIT' FUNCTION


/* ****************  3. GET DESIRED DISTRICT AND DESIRED MODE, ADD TO HIGHLIGHT LAYER	****************/
CTPS.lrtpOD.searchForDistrict = function(){

    // initialize variables/data store
	CTPS.lrtpOD.oHighlightLayer.getSource().clear();
    CTPS.lrtpOD.oDistrictVectorLayer.getSource().clear();
	if ($('#legendOrig').attr('class')==='turned_on'){
		toggle_turn_on('legendOrig');
	};
	if ($('#legendDest').attr('class')==='turned_on'){
		toggle_turn_on('legendDest');
	};
	if ($('#page_bottom').attr('class')==='unhidden'){
		unhide('page_bottom');
	};
	$('#trips_grid').html('');
   
    // get district name from combo box	
	var myselect=document.getElementById("selected_district")
	for (var i=0; i<myselect.options.length; i++){
		if (myselect.options[i].selected==true){
			CTPS.lrtpOD.choice_district = myselect.options[i].value;
		}
	}
	
	if (CTPS.lrtpOD.choice_district === '') { 
		alert("NO DISTRICT SELECTED--TRY AGAIN");
		return;
	}    

    //  create WFS query to display district on map
    var	cqlFilter = "(district_num=='" + CTPS.lrtpOD.choice_district + "')";  
	var szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=' + OD_districts;
		szUrl += '&srsname=EPSG:26986';
		szUrl += '&outputformat=json';
		szUrl += '&cql_filter=' + cqlFilter;
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = new ol.format.GeoJSON();
								var aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert('no district with that name found');
									CTPS.lrtpOD.clearSelection();
									return;
								};
								// Clear, then add highlight layer feature to map
								CTPS.lrtpOD.oHighlightLayer.getSource().clear();
								var source = CTPS.lrtpOD.oHighlightLayer.getSource();
								var attrs = aFeatures[0].getProperties();
								source.addFeature(new ol.Feature(attrs));		
								
								// Set up animated pan/zooom
								var oBounds = { minx: [], miny: [], maxx: [], maxy: [] }; 			
								oBounds.minx.push(aFeatures[0].getGeometry().getExtent()[0]);
								oBounds.miny.push(aFeatures[0].getGeometry().getExtent()[1]);
								oBounds.maxx.push(aFeatures[0].getGeometry().getExtent()[2]);
								oBounds.maxy.push(aFeatures[0].getGeometry().getExtent()[3]);
								
								// *** TBD: The following animation does not work; root cause as-yet not diagnosed.
								//     Consequently, code is commented out.
								// Pan and Zoom to oHighlightLayer
								/*
								CTPS.lrtpOD.map.getView().fit(	
									oBounds, 
									{ 	
										size: CTPS.lrtpOD.map.getSize(),
										constrainResolution: false,
										duration: 2000 	
									}
								);
								*/
							},  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in searchForDistrict failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
	});											                                        //	END OpenLayers Request
        
    if ($('#modeSelect').attr('class')==='hidden'){
		unhide('modeSelect');
    };
               
};	// END 'SearchForDistrict' FUNCTION


CTPS.lrtpOD.getMode = function(){

    var current_year = '2016', future_year = '2040';
   
    $('#trips_grid').html('');
    if ($('#page_bottom').attr('class')==='unhidden'){                             // Link: get table of regions
		unhide('page_bottom');
    };
         
  // get district name from combo box	
	CTPS.lrtpOD.choice_mode = +$("#selected_mode").val(); 
    switch(CTPS.lrtpOD.choice_mode){
    case 1:
        trips_crosstab = 'postgis:dest2040_od_hway_2016';
		// alert('table in use:  2016 highway');
        current_mode = 'AUTO';
        year = current_year;
        break;
    case 2:
        trips_crosstab = 'postgis:dest2040_od_transit_2016';
		//  alert('table in use:  2016 transit');
        current_mode = 'TRANSIT';
        year = current_year;
        break;
    case 3:       
        trips_crosstab = 'postgis:dest2040_od_bikewalk_2016';
		// alert('table in use:  2016 bike/walk');
        current_mode = 'BIKE/WALK';
        year = current_year;
        break;
    case 4:       
        trips_crosstab = 'postgis:dest2040_od_trucks_2016';
		// alert('table in use:  2016 trucks');
        current_mode = 'TRUCK TRIPS';
        year = current_year;
        break; 
    case 5:
        trips_crosstab = 'postgis:dest2040_od_hway_2040';
    //    alert('table in use:  2040 highway');
        current_mode = 'AUTO';
        year = future_year;
        break;
    case 6:
        trips_crosstab = 'postgis:dest2040_od_transit_2040';
		// alert('table in use:  2040 transit');
        current_mode = 'TRANSIT';
        year = future_year;
        break;
    case 7:       
        trips_crosstab = 'postgis:dest2040_od_bikewalk_2040';
		// alert('table in use:  2040 bike/walk');
        current_mode = 'BIKE/WALK';
        year = future_year;
        break;
    case 8:       
        trips_crosstab = 'postgis:dest2040_od_trucks_2040';
		// alert('table in use:  2040 trucks');
        current_mode = 'TRUCK TRIPS';
        year = future_year;
        break;            
    default:
        alert('No table selected. Default is 2016 highway trips.');
        trips_crosstab = 'postgis:dest2040_od_hway_2016';
        break;   
    }

	$('#fetchDataOrigins').prop('disabled', false);
	if ($('#fetchDataOrigins').attr('class')==='hidden'){
		unhide('fetchDataOrigins');
	};
	
	$('#fetchDataDestinations').prop('disabled', false);
	if ($('#fetchDataDestinations').attr('class')==='hidden'){
		unhide('fetchDataDestinations');
	};
	
	if ($('#resetData').attr('class')==='unhidden'){
		unhide('resetData');
	}; 
    
};


/* ****************  4. CREATE OPENLAYERS QUERY TO GET **ORIGIN** DATA FROM TABLE **COLUMN**, ADD TO     ***************
   ****************		DATA STORE, AND CALL 'queryVectorLayers' FUNCTION TO CREATE POLYGON LAYER 		 *************** */               
CTPS.lrtpOD.getOriginData = function(){

    turn_off_vectors();

    if (CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures().length === 0) { 
		alert("No features selected for data request ");
		return;
	} else {	
		var place_lowercase = CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures()[0].getProperties()['district'];  
        var place = place_lowercase.toUpperCase();	// upper case used for field names/column headings in table
	};
      
	CTPS.lrtpOD.myDataOrigins.length = 0;
	
	var szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
	szUrl += '&service=wfs';
	szUrl += '&version=1.0.0';
	szUrl += '&request=getfeature';
	szUrl += '&typename=' + trips_crosstab;
	// szUrl += '&srsname=EPSG:26986';
	szUrl += '&outputformat=json';
	//szUrl += '&propertyname=' + 'TABLE_INDEX,ORIGINS,' + place;	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert("No data returned by WFS request in getOriginData. District = " + place + ".");
									CTPS.lrtpOD.clearSelection();
									return;
								}
								
								var sumOrigins = 0;
								
								// COMPUTE SUM OF TRIPS TO USE IN CALCULATING PERCENTAGES FOR EACH ORIGIN
								for (var i = 0; i < aFeatures.length; i++) {
									sumOrigins += +(aFeatures[i].getProperties()[place_lowercase]);
								}
								
								// Populate myDataOrigins table with WFS data
								for (var i = 0; i < aFeatures.length; i++) {
									var orig_index = +(aFeatures[i].getProperties()['table_index']);
									var orig_zone = +(aFeatures[i].getProperties()['origins']);         
									var orig_trips = +(aFeatures[i].getProperties()[place_lowercase]).toFixed(0);
									var orig_pct = ((orig_trips / sumOrigins) * 100).toFixed(1) + '%';
									CTPS.lrtpOD.myDataOrigins.push([
										orig_index,
										orig_zone,
										orig_trips,
										orig_pct
									]);
								}
								
								CTPS.lrtpOD.myDataOrigins.sort(function(a,b){				
									var stna = parseInt(a[0]), stnb = parseInt(b[0]);
									if (stna > stnb)
										return 1;
									if (stna < stnb)
										return -1;
									return 0;	//default value if no sorting
								});
					  
								var dat_index = 1;	// marker for ORIGIN data
								CTPS.lrtpOD.queryVectorLayers(dat_index);
								if ($('#legendDest').attr('class')==='turned_on'){
									toggle_turn_on('legendDest')
								}
								if ($('#legendOrig').attr('class')==='turned_off'){
									toggle_turn_on('legendOrig')
								}		
							},  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in getOriginData failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
	});
      
} // END 'GetOriginData' FUNCTION


/* ****************  5. CREATE OPENLAYERS QUERY TO GET **DESTINATION** DATA FROM SINGLE TABLE **ROW**, ADD TO  	*************
   ****************     DATA STORE, AND CALL 'queryVectorLayers' FUNCTION TO CREATE POLYGON LAYER    			************* */
CTPS.lrtpOD.getDestinationData = function(){

    turn_off_vectors();

    if (CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures().length === 0) { 
        alert("No features selected for data request ");
		return;
	} else {	
		var place_num = CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures()[0].getProperties()['district'].substr(2);
        var current_district = +place_num; 
	}
      
	CTPS.lrtpOD.myDataDestinations.length = 0;

	var szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
		szUrl += '&service=wfs';
		szUrl += '&version=1.0.0';
		szUrl += '&request=getfeature';
		szUrl += '&typename=' + trips_crosstab;
		// szUrl += '&srsname=EPSG:26986';
		szUrl += '&outputformat=json';
		//szUrl += '&cqlFilter=(ORIGINS="' + current_district + '")';	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert("No data returned by WFS request in getDestinationData. District = " + place + ".");
									CTPS.lrtpOD.clearSelection();
									return;
								};

								// Identify the feature of interest from WFS return:
								var destinationData;
								for (var i=0; i<aFeatures.length; i++){
									if (aFeatures[i].getProperties()['origins'] === current_district){
										destinationData = aFeatures[i].getProperties();
									}
								}
								
								// FIRST LOOP TO GET SUM OF TRIPS FOR PERCENTAGE CALCULATION	
								var dest_zone = [];
								var dest_trips = [];            
								var sumDestinations = 0;
								
								for(var i=0; i<aFeatures.length; i++){
									var dest_index = i + 1;        
									var dest_number = (i<9)?'0'+dest_index:dest_index;
															   
									if (i<41) {
										dest_zone[i] = 'gd' + dest_number;             
									} else {
										dest_zone[i] = 'gd' + (9 + dest_number);              
									}
															   
									dest_trips[i] = +destinationData[dest_zone[i]];	
									sumDestinations += dest_trips[i];                            
								}                   
                         
								// SECOND LOOP TO CALCULATE PERCENTAGES AND WRITE ALL DATA TO DATA STORE
								for(var i=0; i<aFeatures.length; i++){
									var dest_index = i + 1;                            
									var dest_pct = ((dest_trips[i] / sumDestinations) * 100).toFixed(1) + '%';
									
									var dest_zone_trunc; 
									if(i>8){
										dest_zone_trunc = dest_zone[i].substr(2);
									} else {
										dest_zone_trunc = dest_zone[i].substr(3);
									}
									
									CTPS.lrtpOD.myDataDestinations.push([
										dest_index,
										+dest_zone_trunc,
										dest_trips[i],
										dest_pct
									]);
								}
                                                       
								CTPS.lrtpOD.myDataDestinations.sort(function(a,b){				
									var stna = parseInt(a[0]), stnb = parseInt(b[0]);
									if (stna > stnb)
										return 1;
									if (stna < stnb)
										return -1;
									return 0;	// default value if no sorting
								});
              
								var dat_index = 2;	// marker for DESTINATION data                    
								CTPS.lrtpOD.queryVectorLayers(dat_index);
								if ($('#legendOrig').attr('class')==='turned_on'){
									toggle_turn_on('legendOrig')
								}
								if ($('#legendDest').attr('class')==='turned_off'){
									toggle_turn_on('legendDest')
								}                    
							},  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in getDestinationData failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
	});
};	// END 'GetDestinationData' FUNCTION


/* 	***************  6.	GENERATE FILTER STATEMENT FOR DISCTRICT VECTOR LAYER,        					********************
	***************     GENERATE DATA STORE FOR TABLE AND CALL FUNCTION TO POPULATE TABLE,				********************
	***************		POPULATE VECTOR LAYER WITH POLYGONS FOR DISTRICTS, STYLED BY NUMBER OF TRIPS	******************** */
CTPS.lrtpOD.queryVectorLayers = function(dat_index) {
    
	// 0. Define constants within function
	var tripData;
	var szFilter = '';
	
	// 1. Identify whether loading ORIGIN (1) or DESTINATION (2) data, set vector layer styles	
	switch(dat_index){
    case 1:
		tripData = CTPS.lrtpOD.myDataOrigins;
		CTPS.lrtpOD.oDistrictVectorLayer.setStyle(CTPS.lrtpOD.styleOrigin);
		break;
    case 2:
		tripData = CTPS.lrtpOD.myDataDestinations;
		CTPS.lrtpOD.oDistrictVectorLayer.setStyle(CTPS.lrtpOD.styleDestination);
		break;
    default:
		alert('no dat index passed');
		break;
    };
	
	// 2. Generate Data Store (CTPS.lrtpOD.myData) for table grid
	var rec = []; 
	var index,district,trips,pct_trips;
	var maxloop;
	if (tripData.length > 45){								//  NOTE FROM MARYMCS: this was included in CR app because WFS request failed if too long.
		maxloop = 45;										//  Not sure if needed for current version; but data fields 41 to
	} else {                                                //  44 are externals anyway--not represented as 'districts'
		maxloop = tripData.length;
	};
	
	for (var i=0; i<maxloop ;i++) {					        //	Assigns a "category" value to each district based on number of trips
		rec = tripData[i];                                  //  and writes district name to the filter statement for the relevant category 
		index = rec[0];
		district = rec[1];  
        if(i<9){
            district_extend = 'gd0' + district;  
        } else {
            district_extend = 'gd' + district;
        };
        
        trips = rec[2];
        pct_trips = rec[3];         
        CTPS.lrtpOD.myData[i] = {      
			'MyID'			: index,
			'DISTRICT'		: district,
			'TRIPS'			: trips.toLocaleString(),
			'PCT_TRIPS'		: pct_trips                                                                                                     
		};
		
		if(szFilter==''){
			szFilter += "DISTRICT='" + district_extend + "'";
		} else {
			szFilter += " OR DISTRICT='" + district_extend + "'";
		};

	}; // END Loop through all records up to maxloop	
    
	// 3. Populate table grid
    CTPS.lrtpOD.renderToGrid(dat_index);

	// 4. Reset data before WFS request
	if ($('#resetData').attr('class')==='hidden'){
		unhide('resetData');	
	};
	
	// 5. Disable buttons so people can't put in another request before the first one is finished
    $('#fetchDataOrigins').prop('disabled', true);
    $('#fetchDataDestinations').prop('disabled', true);
    $('#resetData').prop('disabled', true);
	
	// 6. MAIN FUNCTION --> WFS request for district vector layer, color-coded by trips
	var szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
	szUrl += '&service=wfs';
	szUrl += '&version=1.0.0';
	szUrl += '&request=getfeature';
	szUrl += '&typename=' + OD_districts;
	szUrl += '&srsname=EPSG:26986';
	szUrl += '&outputformat=json';
	szUrl += '&cqlFilter=' + szFilter;	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									// alert("?? No features found for Layer 1. szFilter is " + szFilter);
									return;
								};
								// CTPS.lrtpOD.oDistrictVectorLayer.getSource().clear();
								var attrs;
								var source = CTPS.lrtpOD.oDistrictVectorLayer.getSource();
								for (var i = 0; i < aFeatures.length; i++) {				
									attrs = aFeatures[i].getProperties();
									source.addFeature(new ol.Feature(attrs));		
								};
								
								// Set up animation
								var oBounds = { minx: [],
												miny: [],
												maxx: [],
												maxy: [] };
								for (var i=0; i<aFeatures.length; i++) {
									var district_num = aFeatures[i].getProperties()["district_num"];
									for (var j=0; j<tripData.length; j++){
										if (tripData[j][2] >=5000 && tripData[j][1] === district_num){
											oBounds.minx.push(aFeatures[i].getGeometry().getExtent()[0]);
											oBounds.miny.push(aFeatures[i].getGeometry().getExtent()[1]);
											oBounds.maxx.push(aFeatures[i].getGeometry().getExtent()[2]);
											oBounds.maxy.push(aFeatures[i].getGeometry().getExtent()[3]);
										};
									};
								};
								// Sometimes there are no districts with >5000 trips, so 'oBounds' will be empty....
								// this causes an OpenLayers error (cannot zoom to infinity), so this if/else is here
								// to zoom to the highlighted districts ONLY when there are 'oBounds' to zoom to.
								if (oBounds.minx.length<1) {
									return;
								} else {
									var oBoundsFull = [	
										Math.min.apply(null,oBounds.minx),
										Math.min.apply(null,oBounds.miny),
										Math.max.apply(null,oBounds.maxx),
										Math.max.apply(null,oBounds.maxy)
									];
									// Animated transition
									CTPS.lrtpOD.map.getView().fit(	
										oBoundsFull, 
										{ 	
											size: CTPS.lrtpOD.map.getSize(), 
											constrainResolution: false,
											duration: 2000 	
										}
									);
								};
							},  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in timerFunc failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown + '\n' + '\n' +
										'Error: WFS request for 1st vector layer failed.');
							}
	});
	
	// 7. Re-enable buttons (disabled at beginning of function)
	$('#fetchDataOrigins').prop('disabled', false);
	$('#fetchDataDestinations').prop('disabled', false);
	$('#resetData').prop('disabled', false);
	
}; // END OF 'queryVectorLayers' FUNCTION


/* 	***************	 7. WRITE DATA TO GRID 'trips_grid' USING SELECTED DATA SOURCE   ******************  */
CTPS.lrtpOD.renderToGrid = function(dat_index) {
 
        $('#trips_grid').html('');
       
        var which_data = '';
        switch(dat_index){
		case 1:
			which_data = ' TO district';
			break;
		case 2:
			which_data = ' FROM district';
			break;
		default:
			alert('no value passe for dat_index');
			break;             
        };
             
        var colDesc = [    
			/*{
				header		: 'index',
				dataIndex	: 'MyID',
				width		: '0px',
				style		: 'align="right"'
			},*/
			{
				header		: '<br>DISTRICT',
				dataIndex 	: 'DISTRICT',
				width		: '50px',
				style		: 'align="right"'
			}, 
			{
				header		: '<br>TRIPS',
				dataIndex 	: 'TRIPS',
				width		: '50px',
				style		: 'align="right"'
			}, 
			{
				header		: '%  of all trips <br>' + which_data,
				dataIndex 	: 'PCT_TRIPS',
				width		: '120px',
				style: 'align="right"'
			} 
		];
                            
        switch(dat_index){
		case 1:     
			CTPS.lrtpOD.OriginGrid = new AccessibleGrid({ 
				divId 		:	'trips_grid',
				tableId 	:	'orig_table',
				summary		: 	'rows are origin districts of trips to selected district including externals and columns are 1 district number 2 number of trips and 3 percent of total trips to this destination',
				caption		:	'Origins of ' + current_mode + ' Trips TO District:  ' + CTPS.lrtpOD.choice_district + ' In Year ' + year,
				ariaLive	:	'assertive',
				colDesc		: 	colDesc
			});			
			CTPS.lrtpOD.OriginGrid.loadArrayData(CTPS.lrtpOD.myData);
			break;
		case 2:
			CTPS.lrtpOD.DestinationGrid = new AccessibleGrid({ 
				divId 		:	'trips_grid',
				tableId 	:	'dest_table',
				summary		: 	'rows are destination districts of trips from selected district including externals and columns are 1 district number 2 number of trips and 3 percent of total trips from this origin',
				caption		:	'Destinations of ' + current_mode + ' Trips FROM District:  ' + CTPS.lrtpOD.choice_district + ' In Year ' + year,
				ariaLive	:	'assertive',
				colDesc		: 	colDesc
			});			
			CTPS.lrtpOD.DestinationGrid.loadArrayData(CTPS.lrtpOD.myData);
			break;
		default:
			alert('nothing exported to grid');
			break;
		};
               
		if($('#page_bottom').attr('class')==='hidden'){
			unhide('page_bottom');
		};
            
}; // END 'renderToGrid' FUNCTION


/* ************  8. RESET DISPLAY AFTER COMBO BOX SELECTION CHANGES--BUT **NOT COMBO BOX ITSELF**  ****************/
/* ************      (invokes 'resetMode'--which keeps same selected district but zeroes out map and grid) *********/
CTPS.lrtpOD.resetDisplay = function() {
    CTPS.lrtpOD.resetMode();
	$("select#selected_mode")[0].selectedIndex = '';
	
	CTPS.lrtpOD.oHighlightLayer.getSource().clear();	
	//CTPS.lrtpOD.map.getView().setCenter(CTPS.lrtpOD.mapCenter);
	//CTPS.lrtpOD.map.getView().setZoom(CTPS.lrtpOD.mapZoom);
	 
	if ($('#modeSelect').attr('class')==='unhidden'){                            // Button: Get Destination Data
		unhide('modeSelect');
	};
} //  END 'resetDisplay' FUNCTION

/* ********************   NOTE:  resetMode can be invoked separately if only desired mode changes   *************************/
CTPS.lrtpOD.resetMode = function(){
	$('#trips_grid').html('');
	// Button: Get Origin Data
	if ($('#fetchDataOrigins').attr('class')==='unhidden'){                   
		unhide('fetchDataOrigins');
	};
	// Button: Get Destination Data
	if ($('#fetchDataDestinations').attr('class')==='unhidden'){
		unhide('fetchDataDestinations');
	};
	// Button: Clear Data
	if ($('#resetData').attr('class')==='unhidden'){
		unhide('resetData');	
	};
	// Link: get table of regions
	if ($('#page_bottom').attr('class')==='unhidden'){
		unhide('page_bottom');
	};
	// Legend for Origins Data
	if ($('#legendOrig').attr('class')==='turned_on'){
		toggle_turn_on('legendOrig');
	};
	// Legend for Destinations Data
	if ($('#legendDest').attr('class')==='turned_on'){
		toggle_turn_on('legendDest');
	};
	turn_off_vectors();
}; // END 'resetMode' FUNCTION


/* *************      9. CLEAR ALL VECTOR LAYERS AS WELL AS COMBO BOX USED TO SELECT DISTRICT   *************/
CTPS.lrtpOD.clearSelection = function() {
	$("select#selected_district")[0].selectedIndex = 0;
    CTPS.lrtpOD.resetDisplay();
	CTPS.lrtpOD.map.getView().animate({
		center: CTPS.lrtpOD.mapCenter,
		zoom: CTPS.lrtpOD.mapZoom,
		duration: 2000
	});	
}; // END 'clearSelection' FUNCTION


/* **************     10. GET POPUP LIST OF ALL CODES AND REGION DEFINITIONS     ****************************/
CTPS.lrtpOD.regions_table = function() {
	popup('regions_lut.html');
}; // CTPS.lcApp.regions_table()

