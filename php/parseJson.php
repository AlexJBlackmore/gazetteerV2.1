<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true) / 1000;

    $countryNamesStr =  file_get_contents("../json/countryBorders.geo.json");
  
    $json_arr = json_decode($countryNamesStr,true);
    
    $countryArr = array();

    class Country
    {
        public $name;
        public $icoCode;
    }

    foreach($json_arr['features'] as $key => $value){
        $myObj = new Country();
        $myObj->name = $value['properties']['name'];
        $myObj->isoCode = $value['properties']['iso_a2'];
        array_push($countryArr, $myObj);
    };

    usort($countryArr, function($a, $b) {
        return strcmp($a->name, $b->name);
    });

    $output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "mission saved";
	$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
    $output['data'] = $countryArr;

    // Output will look like something like this - one PHP fiel with multiple curl api calls
    // $output['data']['isoCodes'] = $countryArr;
    // $output['data']['boundBox'] = $boundingBox;
    // $output['data']['latlng'] = $latLng;



    $output = json_encode($output);
    echo $output;

?>