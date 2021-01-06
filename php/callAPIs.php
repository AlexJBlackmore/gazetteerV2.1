
<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true) / 1000;

// Open geo.json file into a string
$countryDataStr =  file_get_contents("../json/countryBorders.geo.json");

// Decode that string into an array
$countryDataArr = json_decode($countryDataStr, true);



// Make a variable which contains the iso code of the selected country
$isoCode;

// If request contains isoCode (i.e PHP file is being called from onChange selector)
// Then use that as the isoCode
// Otherwise use latlng to obtain isoCode (i.e. PHP file is being called on page load)
if(isset($_REQUEST['isoCode'])){
    $isoCode = $_REQUEST['isoCode'];
} else {
    $url1 = 'http://api.geonames.org/countryCodeJSON?lat=' . $_REQUEST['lat'] . '&lng=' . $_REQUEST['lng'] . '&username=alexblackmore';
    $ch1 = curl_init();
    curl_setopt($ch1, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch1, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch1, CURLOPT_URL,$url1);
    $result1=curl_exec($ch1);
    curl_close($ch1);
    $decode1 = json_decode($result1, true);
    $isoCode = $decode1['countryCode'];
}


// Make a variable which will contain the border of the selected country
$border;
foreach($countryDataArr['features'] as $key => $value){
    if($value['properties']['iso_a2'] == $isoCode){
        $border = $value;
    }
};


// **** countryInfo API call ***
// Obtain country info (includes bounding box)
$url2='http://api.geonames.org/countryInfoJSON?formatted=true&lang=en&country=' . $isoCode . '&username=alexblackmore&style=full';
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_URL,$url2);
$result2=curl_exec($ch2);
curl_close($ch2);
$decode2 = json_decode($result2,true);
// echo 'decode2 is below';
// print_r($decode2);

$north;
$south;
$east;
$west;

if(isset($decode2['geonames'])){
	//Set variables for bounding box
	$north = $decode2['geonames'][0]['north'];
	$south = $decode2['geonames'][0]['south'];
	$east = $decode2['geonames'][0]['east'];
	$west = $decode2['geonames'][0]['west'];
}





// **** earthquakes API call ***
// Obtain earthquakes within bounding box
$url3='http://api.geonames.org/earthquakesJSON?north=' . $north . '&south=' . $south . '&east=' . $east . '&west=' . $west . '&username=alexblackmore&style=full';
$ch3 = curl_init();
curl_setopt($ch3, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch3, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch3, CURLOPT_URL,$url3);
$result3=curl_exec($ch3);
curl_close($ch3);
$decode3 = json_decode($result3,true);

// *** Strip out earthquakes that weren't in country ***
// Step1. Create array for ones which are in country
$withinCountry = array();
$length = count($decode3['earthquakes']);

// Step 2. Loop through earthquakes, call countryCodeJSON api for each one
for ($i = 0; $i < $length; $i++) {		
    $urlTemp = 'http://api.geonames.org/countryCodeJSON?lat=' . $decode3['earthquakes'][$i]['lat'] . '&lng=' . $decode3['earthquakes'][$i]['lng'] . '&username=alexblackmore';
    $chTemp = curl_init();
    curl_setopt($chTemp, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($chTemp, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chTemp, CURLOPT_URL, $urlTemp);
    $resultTemp = curl_exec($chTemp);
    curl_close($chTemp);
    $decodeTemp = json_decode($resultTemp, true);

    // Sometimes the countryCode field comes back as empty so check first that it's set
    if(isset($decodeTemp['countryCode'])) {
        // Step 3. Check if the country code returned matches the original isoCode in the $isoCode variable
        // If it does, add to array
        if(strcmp($decodeTemp['countryCode'], $isoCode) == 0) {
            $withinCountry[] = $decode3['earthquakes'][$i];
        } else {
            // echo 'This earthquake was not in ' . $isoCode . ', it was in ' . $decodeTemp['countryCode'];
        }
    }
}




// **** POIs API call ***
// Obtain points of interest within bounding box
$url4='http://www.mapquestapi.com/search/v2/rectangle?key=WShTiuKNuOVpIuy0PSTkWiy5glMohZ8Y';

// Make this using json_encode() instead of this below string?
$body = '{
    "boundingBox": {
        "ul": {
            "lat": ' . $north . ',
            "lng": ' . $west . '
        },
        "lr": {
            "lat": ' . $south . ',
            "lng": ' . $east . '
        }
    },
    "options": {}
}';

$ch4 = curl_init();
curl_setopt($ch4, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch4, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch4, CURLOPT_URL,$url4);
curl_setopt($ch4, CURLOPT_POST, 1);
curl_setopt($ch4, CURLOPT_POSTFIELDS, $body); 
curl_setopt($ch4, CURLOPT_HTTPHEADER, array('Content-Type: text/plain')); 
$result4=curl_exec($ch4);
curl_close($ch4);
$decode4 = json_decode($result4,true);	

$length2;
$withinCountry2 = array();
if(isset($decode4['searchResults'])){
	$length2 = count($decode4['searchResults']);
	// Loop through POIs, add to array if isoCode matches original variable isocode
	for ($i = 0; $i < $length2; $i++) {
		if(strcmp($decode4['searchResults'][$i]['fields']['country'], $isoCode) == 0) {
			$withinCountry2[] = $decode4['searchResults'][$i];
		} else {
			// echo 'This POI does not belong to ' . $isoCode . 'it belongs to ' . $decode4['searchResults'][$i]['fields']['country'];
		}
	}
}




// **** Wikis API call ***
// Obtain Wiki markers
$url5 = 'http://api.geonames.org/wikipediaBoundingBoxJSON?north=' . $north . '&south=' . $south . '&east=' . $east . '&west=' . $west . '&maxRows=50&username=alexblackmore';
$ch5 = curl_init();
curl_setopt($ch5, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch5, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch5, CURLOPT_URL,$url5);
$result5=curl_exec($ch5);
curl_close($ch5);
$decode5 = json_decode($result5,true);	

// echo 'decode5 is below';
// print_r($decode5);

$length3;
$withinCountry3 = array();
if(isset($decode5['geonames'])) {
	$length3 = count($decode5['geonames']);
	// Loop through wikis, add to array if isoCode matches original variable isocode
	for ($i = 0; $i < $length3; $i++) {
		// Check if countryCode is set first because sometimes it's empty
		if(isset($decode5['geonames'][$i]['countryCode'])) {
			if(strcmp($decode5['geonames'][$i]['countryCode'], $isoCode) == 0) {
				$withinCountry3[] = $decode5['geonames'][$i];
			} else {
				// echo 'This wiki does not belong to ' . $isoCode . 'it belongs to ' . $decode5['geonames'][$i]['countryCode'];
			}
		}		
	}
}




$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "mission saved";
$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";

if(isset($isoCode)) {
	$output['data']['isoCode'] = $isoCode;
}

if(isset($decode2['geonames'])) {
	$output['data']['countryInfo'] = $decode2['geonames'];
}

if(isset($withinCountry)) {
	$output['data']['earthquakes'] = $withinCountry;
}

if(isset($withinCountry2)) {
	$output['data']['POIs'] = $withinCountry2;
}

if(isset($withinCountry3)) {
	$output['data']['wikis'] = $withinCountry3;
}

if(isset($border)) {
	$output['data']['border'] = $border;
}

$output = json_encode($output);
echo $output;


?>