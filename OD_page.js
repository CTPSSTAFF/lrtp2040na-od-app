// Origin/destination app for LRTP 2040 Needs Assessment
//
// The source code for this app was originally written by Mary McShane for the 2014 LRTP using OpenLayers version 2.
// It was migrated to OpenLayers version 3 by Ethan Ebinger in 2017.
// In 2018 it was (minimally) modified by yours truly to read data from a PostGIS data source rather than an Oracle/ArcGIS datasource.
//
// It is currently being modified by yours truly for the 2040 LRTP. This work was originally envisioned as being minimal, 
// but may wind up being more substantive, e.g., reading tabular data from in-memory arrays loaded from CSV files rather than 
// via WFS requests to GeoServer. The tables in question are quite small (ca. 50 x 50 arrays of integers), and the inherited 
// code didn't even bother to perform filetered WFS requests - the entire table in question was always loaded, 
// and as no caching/memoization was performed, this could happen multiple times. We'll see how far I get with this.
//
// In the meantime, as a guide for the perplexed, the following is an overview of the code "as received."
// The main functions (all names are preceded by 'CTPS.lrtpOD.') are:
//
//      preInit - Added by BK to load O/D data tables from CSV files, as preliminary step to (possibly) migrating
//                the app to O/S load from these rather than make WFS requests for it.
//
//      init    - Original initialization function; populates combo box of districts, creates OpenLayers map, etc.
// 
//      searchForDistrict - Event handler for #getDistrict button.
//                          Pans/zooms OpenLayers map to district selected by #selected_district combo box
//
//      getMode - Event handler for #getDistrict button.
//                Essentially, this deterimines the WFS layer containing the O/D data for the {mode, year} pair
//                specified by the value of the #selected_mode combo box. The name of the indicated layer is
//                is left in the global variable "trips_crosstab." (Yeech.)
//
//      getOriginData - Event handler for #fetchDataOrigins button.
//                      Performs a WFS request to retrieve the origin data from the O/D layer whose name
//                      is given by the vale of "trips_crosstab." (Double yeech.) The entire O/D table is
//                      retrived; it is then filtered, the results of which are stored in CTPS.lrtpOD.myDataOrigins.
//                      This function then calls queryVectorLayers, q.v., to render the data.
//
//      getDestinationData - Event handler for #fetchDataDestinations button.
//                           Performs a WFS request to retrieve the desintation data from the O/D layer whose name
//                           is given by the vale of "trips_crosstab." (Double yeech.) The entire O/D table is
//                           retrived; it is then filtered, the results of which are stored in CTPS.lrtpOD.myDataDestinations.
//                           This function then calls queryVectorLayers, q.v., to render the data.
//
//      queryVectorLayers(dat_index) - This function is misnamed, as it does TWO things:
//                                     (1) Renders origin (or destination) data in tabular form;
//                                         this is accomplished by calling "renderToGrid".
//                                     (2) Renders origin (or destination) data as a vector layer in the OpenLayers map;                                
//                                     The value of the parameter "dat_index" indicates whetner origin or destination
//                                     data should be rendered. (Triple yeech.)
//
//      renderToGrid(dat_index) - Reners origin (or destination) data in tabular form.
//                                The value of the parameter "dat_index" indicates whetner origin or destination
//                                data should be rendered. (Quadruble yeech.)
//    
//      resetDisplay - Event handler for #selected_district combo box
//
// The principal data structures (aside from those associated with the OpenLayers map, which are "vanilla") are:
//
//      trips_crosstab - the currently selected O/D table: indicates {mode, year} pair, e.g., 'transit_2016'
//      CTPS.lrtpOD.myDataOrigins - last set of origin data retreived by WFS, and filtered by CTPS.lrtpOD.getOriginData
//      CTPS.lrtpOD.myDataDestinations - last set of destination data retreived by WFS, and filtered by CTPS.lrtpOD.getDestinationData
//
// It is clear that aside from modifying the app to use CSV data sources rather than performing (repeated) WFS requests
// to get O/D data, the code for this app is in need of a lot of TLC. How much can be applied is a function of budget
// and schedule matters outside of this reporter's control. The only requirement is to make the damned thing work with the 2016/2040 data.
// 
// -- B. Krepp 09 April 2019

var CTPS = {};
CTPS.lrtpOD = {};
CTPS.lrtpOD.map = {};
CTPS.lrtpOD.tabs = {};
CTPS.lrtpOD.myData = [];
CTPS.lrtpOD.myDataOrigins = [];
CTPS.lrtpOD.myDataDestinations = [];
CSSClass = {};

CTPS.lrtpOD.mapCenter = [232592.43833705207, 893760.2746035221];
CTPS.lrtpOD.mapZoom = 3.0;

// Endpoints for WMS and WFS services
// CTPS.lrtpOD.szServerRoot  = 'http://www.ctps.org:8080/geoserver/'; 
CTPS.lrtpOD.szServerRoot  = location.protocol + '//' + location.hostname + '/maploc/'; 
CTPS.lrtpOD.szWMSserverRoot = CTPS.lrtpOD.szServerRoot + '/wms'; 
CTPS.lrtpOD.szWFSserverRoot = CTPS.lrtpOD.szServerRoot + '/wfs';

// Variables for frequently used WMS map layer files
var ne_states = 'postgis:mgis_nemask_poly';
var towns_base = 'postgis:dest2040_towns_modelarea';
var MA_mask = 'postgis:ctps_ma_wo_model_area';
var OD_districts = 'postgis:dest2040_districts_sm_circles';
var roadways = 'postgis:ctps_roadinventory_grouped';
// Selected WFS layer with O/D data
var trips_crosstab = 'postgis:dest2040_od_hway_2016';   // Default: just a placeholder
// Misc global vars
var current_mode = 'AUTO';
var year = '';

// Global constants
// Districts within the MPO are numbered from 1 through 41, inclusive
// Districts outside the MPO are numbered from 51 through 54, inclusive
var MAX_MPO_DISTRICT_NUM = 41; 
var MAX_EXTERNAL_DISTRICT_NUM = 54;
var districtNums =  [1,   2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 
                     21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 
                     41, 
                     51, 52, 53, 54];
var districtNames = ['gd01', 'gd02', 'gd03', 'gd04', 'gd05', 'gd06', 'gd07', 'gd08', 'gd09', 'gd10', 
                     'gd11', 'gd12', 'gd13', 'gd14', 'gd15', 'gd16', 'gd17', 'gd18', 'gd19', 'gd20', 
                     'gd21', 'gd22', 'gd23', 'gd24', 'gd25', 'gd26', 'gd27', 'gd28', 'gd29', 'gd30', 
                     'gd31', 'gd32', 'gd33', 'gd34', 'gd35', 'gd36', 'gd37', 'gd38', 'gd39', 'gd40', 
                     'gd41',
                     'gd51', 'gd52', 'gd53', 'gd54'];

// Global store of O/D data read from CSV sources
var OD_DATA = { 'hway_2016'     : null, 
                'hway_2040'     : null,
                'bikewalk_2016' : null,
                'bikewalk_2040' : null,
                'transit_2016'  : null, 
                'transit_2040'  : null,
                'trucks_2016'   : null,
                'trucks_2040'   : null
};
var od_table = null; // Currently selected table in OD_DATA

//	Vector layer style functions
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
}; // styleOrigin()

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
}; // styleDestination()

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

// End of utility functions

// Pre-initialization: load CSV data files, then call original init function
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
}; // preInit()

/* ****************  2. Initialize page, create and render OpenLayers map.  *****************/
CTPS.lrtpOD.init = function(error, results){
    if (error != null) {
        alert("One or more requests to load CSV data failed. Exiting application.");
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
        rec.gd41 = +rec.gd41;
        rec.gd51 = +rec.gd51; rec.gd52 = +rec.gd52; rec.gd53 = +rec.gd53; rec.gd54 = +rec.gd54;
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
    
    // Arm event handlers for <buttons> and <select> boxes
    //
    $('#selected_district').change(CTPS.lrtpOD.resetDisplay);
    $('#getDistrict').click(CTPS.lrtpOD.searchForDistrict);
    $('#selected_mode').change(CTPS.lrtpOD.resetMode);
    $('#getMode').click(CTPS.lrtpOD.getMode);
    $('#fetchDataOrigins').click(CTPS.lrtpOD.getOriginData);
    $('#fetchDataDestinations').click(CTPS.lrtpOD.getDestinationData);
    $('#resetData').click(CTPS.lrtpOD.clearSelection);
    $('#display_districts_table').click(CTPS.lrtpOD.displayDistrictsTable);
    
    // Populate "select district" combo box.
    var i;        
    var oSelect = document.getElementById("selected_district"); 
    var oOption;  // An <option> to be added to the  <select>.
    for (i = 0; i < MPMUTILS.modelDistricts_2016.length; i++) {           
        oOption = document.createElement("OPTION");
        oOption.value = MPMUTILS.modelDistricts_2016[i][0];
        oOption.text = MPMUTILS.modelDistricts_2016[i][0] + ', ' + MPMUTILS.modelDistricts_2016[i][2];        
        oSelect.options.add(oOption);
    };
    
    // Define WMS layers
    var oBaseLayers = new ol.layer.Tile({	
        source: new ol.source.TileWMS({
            url		:  CTPS.lrtpOD.szWMSserverRoot,
            params	: {
                'LAYERS': 	[
                                ne_states,
                                roadways,
                                MA_mask,
                                OD_districts,
                                
                                towns_base	],
                'STYLES': 	[	
                               'ne_states',
                                'RoadsMultiscaleGroupedBGblue',
                                'non_boston_mpo_gray_mask',
                                
                                'Dest2040_districts_ext_numbers',
                                
                                'Dest2040_towns_OD_boundaries'	],
                'TILED': 	[	
                                'true',
                                'true',
                                'true',
                                
                                'true',
                                
                                'false'	],
                'TRANSPARENT': 	[	
                                    'false',
                                    'true',
                                    'true',
                                    
                                    'true',
                                    
                                    'true'	],
                'IDS' : [	
                            'ne_states',
                            'roadways',
                            'non_boston_mpo_gray_mask',
                            
                            'OD_districts',
                            
                            'towns_base'	]
            }
        })
    }); 	
    
    // Define vector layers
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
    
    // Create OpenLayers map
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
}; // init()

////////////////////////////////////////////////////////////////////////////////
// Function: searchForDistrict
//
// 1. Get desired district and desired from combo box
// 2. Perform WFS request to retrieve its geometry
// 3. Render district on map as vector layer
// 4. Unhide select mode combo box
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.searchForDistrict = function(e){
    var myselect, i, cqlFilter, szUrl;
    
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
	myselect = document.getElementById("selected_district");
	for (i = 0; i < myselect.options.length; i++){
		if (myselect.options[i].selected==true){
			CTPS.lrtpOD.choice_district = myselect.options[i].value;
		}
	}
	
	if (CTPS.lrtpOD.choice_district === '') { 
		alert("searchForDistrict: No district selected--try again.");
		return;
	}    

    //  Perform WFS request to retrieve geometry for selected distrcit, and render it on the map
    cqlFilter = "(district_num=='" + CTPS.lrtpOD.choice_district + "')";  
	szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
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
							},  // success handler
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in searchForDistrict failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}   // failure handler
	});	//	WFS request
        
    if ($('#modeSelect').attr('class')==='hidden'){
		unhide('modeSelect');
    }          
};	// searchForDistrict()

CTPS.lrtpOD.getMode = function(e){
    var current_year = '2016', future_year = '2040';
   
    $('#trips_grid').html('');
    if ($('#page_bottom').attr('class')==='unhidden'){   // Link: to display table of regions
		unhide('page_bottom');
    };
         
  // Get {mode,year} pair from combo box
	CTPS.lrtpOD.choice_mode = $("#selected_mode").val(); 
    switch(CTPS.lrtpOD.choice_mode){
    case 'hway_2016':
        trips_crosstab = 'postgis:dest2040_od_hway_2016';
        od_table = OD_DATA['hway_2016'];
        current_mode = 'AUTO';
        year = current_year;
        break;
    case 'transit_2016':
        trips_crosstab = 'postgis:dest2040_od_transit_2016';
        od_table = OD_DATA['transit_2016'];
        current_mode = 'TRANSIT';
        year = current_year;
        break;
    case 'bikewalk_2016':       
        trips_crosstab = 'postgis:dest2040_od_bikewalk_2016';
        od_table = OD_DATA['bikewalk_2016'];
        current_mode = 'BIKE/WALK';
        year = current_year;
        break;
    case 'trucks_2016':       
        trips_crosstab = 'postgis:dest2040_od_trucks_2016';
        od_table = OD_DATA['trucks_2016'];
        current_mode = 'TRUCK TRIPS';
        year = current_year;
        break; 
    case 'hway_2040':
        trips_crosstab = 'postgis:dest2040_od_hway_2040';
        od_table = OD_DATA['hway_2040'];
        current_mode = 'AUTO';
        year = future_year;
        break;
    case 'transit_2040':
        trips_crosstab = 'postgis:dest2040_od_transit_2040';
        od_table = OD_DATA['transit2040'];
        current_mode = 'TRANSIT';
        year = future_year;
        break;
    case 'bikewalk_2040':       
        trips_crosstab = 'postgis:dest2040_od_bikewalk_2040';
        od_table = OD_DATA['bikewalk_2040'];
        current_mode = 'BIKE/WALK';
        year = future_year;
        break;
    case 'trucks_2040':       
        trips_crosstab = 'postgis:dest2040_od_trucks_2040';
        od_table = OD_DATA['trucks_2040'];
        current_mode = 'TRUCK TRIPS';
        year = future_year;
        break;            
    default:
        alert('No table selected. Default is 2016 highway trips.');
        trips_crosstab = 'postgis:dest2040_od_hway_2016';
        od_table = OD_DATA['hway_2016'];
        break;   
    }

	$('#fetchDataOrigins').prop('disabled', false);
	if ($('#fetchDataOrigins').attr('class')==='hidden'){
		unhide('fetchDataOrigins');
	};
	
	$('#fetchDataDestinations').prop('disabled', false);
	if ($('#fetchDataDestinations').attr('class')==='hidden'){
		unhide('fetchDataDestinations');
	}
	
	if ($('#resetData').attr('class')==='unhidden'){
		unhide('resetData');
	}
}; // getMode()

////////////////////////////////////////////////////////////////////////////////
// Function: getOriginData()
//
// 1. Perform WFS request to get O/D data for selected {year, mode} pair
// 2. Extract relevant data from table ***COLUMN***
// 3. Add this data to the data store
// 4. Call 'queryVectorLayers' function to create and render polygon vector layer on map to show origin info
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.getOriginData = function(e){
    var szUrl;
    
    turn_off_vectors();

    if (CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures().length === 0) { 
		alert("No features selected for data request ");
		return;
	} else {	
		var place_lowercase = CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures()[0].getProperties()['district'];  
        var place = place_lowercase.toUpperCase();	// upper case used for field names/column headings in table
	};
      
	CTPS.lrtpOD.myDataOrigins.length = 0;
	
	szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
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
								
								var i, sumOrigins = 0;
								
								// Compute sum of trips to use in calculating percentages for each origin
								for (i = 0; i < aFeatures.length; i++) {
									sumOrigins += +(aFeatures[i].getProperties()[place_lowercase]);
								}
								
								// Populate myDataOrigins table with WFS data
								for (i = 0; i < aFeatures.length; i++) {
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
					  
								var dat_index = 1;	// Indication that data to be rendered is ORIGIN data   
                                // The following call is OVERLOADED; it performs two functions;
                                //     (1) renders origin data as vector layers on the OpenLayers map
                                //     (2) renders origin data in tabular form
								CTPS.lrtpOD.queryVectorLayers(dat_index);
								if ($('#legendDest').attr('class')==='turned_on'){
									toggle_turn_on('legendDest')
								}
								if ($('#legendOrig').attr('class')==='turned_off'){
									toggle_turn_on('legendOrig')
								}		
							},  // success handler
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in getOriginData failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}   // failure handler
	}); // WFS request
}; // getOriginData()

////////////////////////////////////////////////////////////////////////////////
// Function: getDestinationData
//
// 1. Perform WFS request query to get O/D data
// 2. Extract DESTINATION data from single table ***ROW***
// 3. Add to this data to the data store
// 4. CALL 'queryVectorLayers' function to create and render polygon vector layer on map to show destination info
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.getDestinationData = function(e){
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
								for (var i = 0; i < aFeatures.length; i++){
									if (aFeatures[i].getProperties()['origins'] === current_district){
										destinationData = aFeatures[i].getProperties();
									}
								}
								
								// First loop to get sum of trips for percentage calculation	
								var dest_zone = [];
								var dest_trips = [];            
								var sumDestinations = 0;
								
								for(var i = 0; i < aFeatures.length; i++){
									var dest_index = i + 1;        
									var dest_number = (i < 9) ? '0' + dest_index : dest_index;
															   
									if (i < MAX_MPO_DISTRICT_NUM) {
										dest_zone[i] = 'gd' + dest_number;             
									} else {
										dest_zone[i] = 'gd' + (8 + dest_number);              
									}
															   
									dest_trips[i] = +destinationData[dest_zone[i]];	
									sumDestinations += dest_trips[i];                            
								}                   
                         
								// Second loop to calculate percentages and write all data to data store
								for(var i = 0; i < aFeatures.length; i++){
									var dest_index = i + 1;                            
									var dest_pct = ((dest_trips[i] / sumDestinations) * 100).toFixed(1) + '%';
									
									var dest_zone_trunc; 
									if(i > 8){
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
              
								var dat_index = 2;	// Indication that data to be rendered is DESTINATION data   
                                // The following call is OVERLOADED; it performs two functions;
                                //     (1) renders destination data as vector layers on the OpenLayers map
                                //     (2) renders destination data in tabular form
								CTPS.lrtpOD.queryVectorLayers(dat_index);
								if ($('#legendOrig').attr('class')==='turned_on'){
									toggle_turn_on('legendOrig')
								}
								if ($('#legendDest').attr('class')==='turned_off'){
									toggle_turn_on('legendDest')
								}                    
							},  // success handler
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in getDestinationData failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}   // failure  handler
	}); // WFS request
};	// getDestinationData()


// ************************************************************************************************************************
// Replacement Function: getDestinationData
//
// *** This is a work-in-progress pending receipt of answers to various questions from Ethan Ebinger
//
// ************************************************************************************************************************
CTPS.lrtpOD.REPLACEMENT_getDestinationData = function(e){
    var i, district_name, district_num, current_district, destinationData;
    
    turn_off_vectors();

    if (CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures().length === 0) { 
        alert("No features selected for data request ");
		return;
	} else {
        // *** 04/04/19 - the following statement should give one pause ... :-(
        district_name = CTPS.lrtpOD.oHighlightLayer.getSource().getFeatures()[0].getProperties()['district'];
		district_num = +district_name.replace('gd','');
        current_district = district_num; 
	}
      
	CTPS.lrtpOD.myDataDestinations.length = 0;
    
    // trips_crosstab specifies WFS to interrogate, but *od_table* specifies in-memory O/D table to interrogate
 
    destinationData = _.find(od_table, function(rec) { return (rec.origins === current_district); });
    
								
    // First loop to get sum of trips for percentage calculation	
    var dest_zone = [];
    var dest_trips = [];            
    var sumDestinations = 0;
								
    for (i = 0; i < aFeatures.length; i++){
        var dest_index = i + 1;        
        var dest_number = (i < 9) ? '0' + dest_index : dest_index;
                                   
        if (i < MAX_MPO_DISTRICT_NUM) {
            dest_zone[i] = 'gd' + dest_number;             
        } else {
            dest_zone[i] = 'gd' + (8 + dest_number);              
        }
                                   
        dest_trips[i] = +destinationData[dest_zone[i]];	
        sumDestinations += dest_trips[i];                            
    }                   

    // Second loop to calculate percentages and write all data to data store
    for(i = 0; i < aFeatures.length; i++){
        var dest_index = i + 1;                            
        var dest_pct = ((dest_trips[i] / sumDestinations) * 100).toFixed(1) + '%';
        
        var dest_zone_trunc; 
        if(i > 8){
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

    var dat_index = 2;	// Indication that data to be rendered is DESTINATION data   
    // The following call is OVERLOADED; it performs two functions;
    //     (1) renders destination data as vector layers on the OpenLayers map
    //     (2) renders destination data in tabular form
    CTPS.lrtpOD.queryVectorLayers(dat_index);
    
    if ($('#legendOrig').attr('class')==='turned_on'){
        toggle_turn_on('legendOrig');
    }
    if ($('#legendDest').attr('class')==='turned_off'){
        toggle_turn_on('legendDest');
    }

};	// REPLACEMENT_getDestinationData()

////////////////////////////////////////////////////////////////////////////////
// Function: queryVectorLayers
//
// This function is misnamed, as it does TWO things, misleadingly the first of
// which has nothing to do with vector layers:
// 
//(1) Renders origin (or destination) data in tabular form; this is accomplished 
//    by calling "renderToGrid".
//(2) Renders origin (or destination) data as a vector layer in the OpenLayers map;                                
//    The value of the parameter "dat_index" indicates whetner origin or destination
//    data should be rendered. (Editorial comments OFF.)
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.queryVectorLayers = function(dat_index) {
    var tripData, szFilter, rec = [], index, district, trips, pct_trips, maxloop, i, szUrl;
    
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
		alert('No data_index passed to queryVectorLayers.');
		break;
    };
	
/*
	if (tripData.length > 45){								//  NOTE FROM MARYMCS: this was included in CR app because WFS request failed if too long.
		maxloop = 45;										//  Not sure if needed for current version; but data fields 41 to
	} else {                                                //  44 are externals anyway--not represented as 'districts'
		maxloop = tripData.length;
	};
*/
    maxloop = tripData.length;
	
	for (i = 0; i < maxloop; i++) {					        //	Assigns a "category" value to each district based on number of trips
		rec = tripData[i];                                  //  and writes district name to the filter statement for the relevant category 
		index = rec[0];
		district = rec[1];  
        if (i < 9){
            district_extend = 'gd0' + district;  
        } else {
            district_extend = 'gd' + district;
        }
        
        trips = rec[2];
        pct_trips = rec[3];         
        CTPS.lrtpOD.myData[i] = {      
			'MyID'			: index,
			'DISTRICT'		: district,
			'TRIPS'			: trips.toLocaleString(),
			'PCT_TRIPS'		: pct_trips                                                                                                     
		};
		
		if (szFilter==''){
			szFilter += "DISTRICT='" + district_extend + "'";
		} else {
			szFilter += " OR DISTRICT='" + district_extend + "'";
		}

	} // END Loop through all records up to maxloop	
    
	// 3. Populate table grid
    CTPS.lrtpOD.renderToGrid(dat_index);

	// 4. Reset data before WFS request
	if ($('#resetData').attr('class')==='hidden'){
		unhide('resetData');	
	}
	
	// 5. Disable buttons so people can't put in another request before the first one is finished
    $('#fetchDataOrigins').prop('disabled', true);
    $('#fetchDataDestinations').prop('disabled', true);
    $('#resetData').prop('disabled', true);
	
	// 6. MAIN FUNCTION --> WFS request for district vector layer, color-coded by trips
	szUrl = CTPS.lrtpOD.szWFSserverRoot + '?';
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
									// alert("WFS request returned no features. szFilter is " + szFilter);
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
							},  // success handler  
			failure		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in timerFunc failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown + '\n' + '\n' +
										'Error: WFS request for 1st vector layer failed.');
							}   // failure handler
	}); // WFS request
    
	// 7. Re-enable buttons (disabled at beginning of function)
	$('#fetchDataOrigins').prop('disabled', false);
	$('#fetchDataDestinations').prop('disabled', false);
	$('#resetData').prop('disabled', false);
}; // queryVectorLayers()

////////////////////////////////////////////////////////////////////////////////
// Function: renderToGrid
// 
// Render data to accessible HTML 'trips_grid' using data source specified by 'dat_index' parameter:
//     dat_index === 1 ---> data source is CTPS.lrtpOD.OriginGrid
//     dat_index === 2 ---> data source is CTPS.lrtpOD.DestinationGrid
// (Editorial comments OFF.)
//
////////////////////////////////////////////////////////////////////////////////
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
			alert('Error: renderToGrid: No value passed as dat_index.');
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
			alert('renderToGrid: No data rendered to grid.');
			break;
		}
               
		if ($('#page_bottom').attr('class')==='hidden') {
			unhide('page_bottom');
		}   
}; // renderToGrid()

////////////////////////////////////////////////////////////////////////////////
// Function: resetDisplay
//
// Resets display after combo box selection changes but does NOT reset combo box itself.
// Calls 'resetMode', which keeps same district selectec, but zeroes out map and grid.
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.resetDisplay = function(e) {
    CTPS.lrtpOD.resetMode();
	$("select#selected_mode")[0].selectedIndex = '';
	
	CTPS.lrtpOD.oHighlightLayer.getSource().clear();	
	//CTPS.lrtpOD.map.getView().setCenter(CTPS.lrtpOD.mapCenter);
	//CTPS.lrtpOD.map.getView().setZoom(CTPS.lrtpOD.mapZoom);
	 
	if ($('#modeSelect').attr('class')==='unhidden'){                            // Button: Get Destination Data
		unhide('modeSelect');
	};
}; //  resetDisplay()

////////////////////////////////////////////////////////////////////////////////
// Function: resetMode
//
// Comment from Mary McShane: resetMode can be invoked separately if only desired mode changes
//
////////////////////////////////////////////////////////////////////////////////
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
}; // resetMode()

////////////////////////////////////////////////////////////////////////////////
// Function: clearSelection
// 
// Clear all vector layers as well as combo box used to select district.
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.clearSelection = function(e) {
	$("select#selected_district")[0].selectedIndex = 0;
    CTPS.lrtpOD.resetDisplay();
	CTPS.lrtpOD.map.getView().animate({
		center: CTPS.lrtpOD.mapCenter,
		zoom: CTPS.lrtpOD.mapZoom,
		duration: 2000
	});	
}; // clearSelection()

////////////////////////////////////////////////////////////////////////////////
// Function: displayDistrictsTable
//
/// Open separate HTML page with textual descriptions of districts.
//
////////////////////////////////////////////////////////////////////////////////
CTPS.lrtpOD.displayDistrictsTable = function(e) {
	popup('regions_lut.html');
}; // displayDistrictsTabl()
