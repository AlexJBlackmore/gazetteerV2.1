let map;
let borderFeatureGroup;

$(window).on('load', async function () {   
	
	// Hide spinner if div loaded
	if ($('#preloader').length) {      
		$('#preloader').delay(100).fadeOut('slow', function () {        
			$(this).remove();      
		});    
    }
	
	// Create map
	const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	map = L.map('mapid').setView([51.505, -0.09], 13);
	L.tileLayer(tileUrl, { minZoom: 3, noWrap: true, attribution: attribution}).addTo(map);

	// Set max bounds of map so that you can't see grey space
	const southWest = L.latLng(-89.98155760646617, -180);
	const northEast = L.latLng(89.99346179538875, 180);
	const bounds = L.latLngBounds(southWest, northEast);
	map.setMaxBounds(bounds);
	map.on('drag', function() {
		map.panInsideBounds(bounds, { animate: false });
	});

	// Populate country selector
	$.ajax({
		url: "./php/parseJson.php",
		dataType: 'json',
		success: function(result) {
			// console.log(result);
			for (i = 0; i < result['data'].length; i++) {
				$('#countrySelect').append($('<option>', {value:result['data'][i]['isoCode'], text:result['data'][i]['name']}));
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			alert("ParseJSON - the following error occured: " + jqXHR.status + " " + textStatus);
		}
	});

	// Set options for geting user location
	const options = {
		enableHighAccuracy: true,
		timeout: 5000,
		maximumAge: 0
	};

	// Get user location
	navigator.geolocation.getCurrentPosition(getPosSuccess, getPosError, options);

	// Set on change handler
	$('#countrySelect').on('change', changeCountry);

});

// Function called when select is changed
async function changeCountry() {
	// Get isoCode from select
	const isoCode = $('#countrySelect').val();
	
	// Call APIs with it
	const data = await callAPIsWithIso(isoCode);
	console.log(data);





	// **** Border section****

	// Variable for border geojson
	const border = data['border'];
	// borderFeatureGroup is defined at start of file (global)
	// If border already set then remove
	if(borderFeatureGroup){
        map.removeLayer(borderFeatureGroup);
	}
	// Set borderFeaturegroup to the geoJson and pan to that area
    borderFeatureGroup = L.geoJSON(border).addTo(map);
	map.fitBounds(borderFeatureGroup.getBounds());





	// **** CountryInfo API call section****
	
	// Extract values from countryInfo API call
	const countryName = data['countryInfo'][0]['countryName'];
	const capital = data['countryInfo'][0]['capital'];
	const currency = data['countryInfo'][0]['currencyCode'];
	const population = data['countryInfo'][0]['population'];
	const area = data['countryInfo'][0]['areaInSqKm'];
	const languages = data['countryInfo'][0]['languages'];
	
	// Set modal html
	$('#modalTitle').html(countryName);
	$('#capitalCell').html(capital);
	$('#currencyCell').html(currency);
	$('#populationCell').html(new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(population));
	$('#areaCell').html(new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(area));
	$('#languagesCell').html(languages);
	$('#countryFlag').attr('src', `https://www.countryflags.io/${isoCode}/flat/64.png`);

	// Trigger modal popup
	$("#myModal").modal({backdrop: false});




	// **** Earthquakes API call section****
	
	// Variable to store earthquakes array
	let earthquakes = null;
	// Length of array
	let earthquakesLength = null;
	
	// First check if there are actually earthquakes in the response
	if(data['earthquakes']){
		earthquakes = data['earthquakes'];
		earthquakesLength = earthquakes.length

		// Create array for all coords of earthquakes
		let earthquakesCoords = [];
		// Create a clusergroup for earthquakes
		let earthquakesClusterGroup = L.markerClusterGroup();

		for(i = 0; i < earthquakesLength; i++) {
			// Extract values from each earthquake in earthquakes API call
			const lat = earthquakes[i]['lat'];
			const lng = earthquakes[i]['lng'];
			const date = earthquakes[i]['datetime'].substring(0, 10);
			const time = earthquakes[i]['datetime'].substring(11, 19);
			const depth = earthquakes[i]['depth'];
			const magnitude = earthquakes[i]['magnitude'];

			// Add lat lng to coords array
			earthquakesCoords[i] = [lat, lng];

			// Create markers and add content
			const marker = L.marker([lat, lng]);

			// Html to be included in pop up
			const html = `<h5>Earthquake information</h5>
			<table class="table">
				<tr>
					<td>Date: </td>
					<td>${date}</td>
				</tr>
				<tr>
					<td>Time: </td>
					<td>${time}</td>
				</tr>
				<tr>
					<td>Depth: </td>
					<td>${depth}</td>
				</tr>
				<tr>
					<td>Magnitude: </td>
					<td>${magnitude}</td>
				</tr>
			</table>`;

			// Bind html to popup
			marker.bindPopup(html);
			// Assign pop up onclick listener
			marker.on('click', onClick);
			// Add marker to cluster group
			earthquakesClusterGroup.addLayer(marker);
		}

		// Add cluster group to map
		map.addLayer(earthquakesClusterGroup);
	}




	// **** Wiki API call section****

	// Variable to store wikis array
	let wikis = null;
	// Length of array
	let wikisLength = null;
	// First check if there are actually earthquakes in the response
	if(data['wikis']){
		wikis = data['wikis'];
		wikisLength = wikis.length

		// Create array for all coords of earthquakes
		let wikisCoords = [];
		// Create a clusergroup for earthquakes
		let wikisClusterGroup = L.markerClusterGroup();

		for(i = 0; i < wikisLength; i++) {
			// Extract values from each earthquake in earthquakes API call
			const lat = wikis[i]['lat'];
			const lng = wikis[i]['lng'];
			const summary = wikis[i]['summary'];
			const title = wikis[i]['title'];
			const wikiUrl = wikis[i]['wikipediaUrl'];
			const wikiImage = wikis[i]['thumbnailImg'];

			// Add lat lng to coords array
			wikisCoords[i] = [lat, lng];

			// Create markers and add content
			const marker = L.marker([lat, lng]);

			// Html to be included in pop up
			let html;
			if(wikiImage) {
				html = `<h4>${title}</h4>
					<p>${summary}</p>
					<img src="${wikiImage}" alt="${summary}" class="img-fluid" />
					<br>
					<a href="https://${wikiUrl}">View Wikipedia article</a>`;
			} else {
				html = `<h4>${title}</h4>
				<p>${summary}</p>
				<br>
				<a href="https://${wikiUrl}">View Wikipedia article</a>`;
			}

			// Bind html to popup
			marker.bindPopup(html);
			// Assign pop up onclick listener
			marker.on('click', onClick);
			// Add marker to cluster group
			wikisClusterGroup.addLayer(marker);
		}

		// Add cluster group to map
		map.addLayer(wikisClusterGroup);
	}

}

// Marker onclick function
function onClick(e) {
	e.target.getPopup().openOn(map);
}

// Navigator success handler
async function getPosSuccess(pos) {
	
	// Make a variable for coords
	const crd = pos.coords;
	console.log('Your current position is:');
	console.log(`Latitude : ${crd.latitude}`);
	console.log(`Longitude: ${crd.longitude}`);
	console.log(`More or less ${crd.accuracy} meters.`);
	
	// Call the APIs
	const data = await callAPIsWithLatLng(crd.latitude, crd.longitude);
	console.log(data);

	// Extract values from response into variables
	const countryName = data['countryInfo'][0]['countryName'];
	const capital = data['countryInfo'][0]['capital'];
	const currency = data['countryInfo'][0]['currencyCode'];
	const population = data['countryInfo'][0]['population'];
	const area = data['countryInfo'][0]['areaInSqKm'];
	const languages = data['countryInfo'][0]['languages'];
	const isoCode = data['countryInfo'][0]['countryCode'];

	// Set modal html
	$('#modalTitle').html(countryName);
	$('#capitalCell').html(capital);
	$('#currencyCell').html(currency);
	$('#populationCell').html(new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(population));
	$('#areaCell').html(new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 }).format(area));
	$('#languagesCell').html(languages);
	$('#countryFlag').attr('src', `https://www.countryflags.io/${isoCode}/flat/64.png`);

	// Trigger modal
	$("#myModal").modal({backdrop: false});
}

// Navigator error handler
function getPosError(err) {
	console.warn(`ERROR(${err.code}): ${err.message}`);
}

// callAPIs can take lat lng as params or isoCode
function callAPIsWithLatLng(lat, lng) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callAPIs.php",
			type: 'POST',
			dataType: 'json',
			data: {
				lat: lat,
				lng: lng
			},
			success: function(result) {
				console.log(result);
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("Call APIs latlng - The following error occured: " + jqXHR.status + " " + textStatus);
			}
		}); 
	});
}

//callAPIs can take lat lng as params or isoCode
function callAPIsWithIso(isoCode) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "./php/callAPIs.php",
			type: 'POST',
			dataType: 'json',
			data: {
				isoCode: isoCode
			},
			success: function(result) {
				// console.log(result);
				// This will set the promise state to fulfilled 
				// and set the promise value to the result of the isoCode
				resolve(result['data']);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("Call APIs iso - The following error occured: " + jqXHR.status + " " + textStatus);
				console.log(`jqXHR is ${jqXHR} and textStatus is ${textStatus} and errorThrown is ${errorThrown}`);
				console.log('jqrResponse text is ' + jqXHR.responseText);
			}
		}); 
	});
}