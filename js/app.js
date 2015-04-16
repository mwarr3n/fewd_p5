'use strict';
 
function viewModel() {
	var self = this,
	map = new google.maps.Map(document.getElementById('map-canvas'), {zoom:12,disableDefaultUI: true}),
	geocoder = new google.maps.Geocoder(),
	infowindow = new google.maps.InfoWindow({content: ''});

	// info window close event
	google.maps.event.addListener(infowindow,'closeclick',function(){
		self.selectItem(self.selectedItem());
	});

	// store the current location
	self.location = 'Birmingham, AL';

	// filter value
	self.filter = ko.observable('');
	
	// boolean value for list visibility
	self.isListVisible = ko.observable(false);
	
	// list of items returned from google search
	self.items = ko.observableArray([]);

	// selected item
	self.selectedItem = ko.observable({});


	/**
	 * filter items based on filter text
	 */
	self.itemsToShow = ko.pureComputed(function() {

		var searchValue = this.filter().toLowerCase();

		if (searchValue === ''){

			// show all markers
			for (var i = 0; i < self.items().length; i++) {
				self.items()[i].marker.setVisible(true);
			}

			// return default items array if no filter criteria
			return self.items();

		} else{

			return ko.utils.arrayFilter(self.items(), function(item) {

					if(item.name.toLowerCase().indexOf(searchValue) >= 0){
						item.marker.setVisible(true);
						
					}else {
						item.marker.setVisible(false);
					}

					return item.name.toLowerCase().indexOf(searchValue) >= 0;
			});  
		}
	}, this);

	/**
	 * toggle list visibility
	 * @return {void}
	 */
	self.toggleList = function() {

		if(self.isListVisible()) {
			self.isListVisible(false);
		} else {
			self.isListVisible(true);
		}
	}

	/**
	 * process selection
	 * @param  {object} item 
	 * @return {void}
	 */
	self.selectItem = function (item) {

		// is an item selected  
		if(!!self.selectedItem().id) { 
			 // is it the same item that was already selected
			 if(self.selectedItem().id == item.id) { 
					// clear marker animation and set item to null
					item.marker.setAnimation(null);
					item = {}
			 }else{

					// not the same. clear old animation and set new
					self.selectedItem().marker.setAnimation(null);
					item.marker.setAnimation(google.maps.Animation.BOUNCE);
			 }
		}else {
			item.marker.setAnimation(google.maps.Animation.BOUNCE);
		}

		showinfoWindow(item);
		self.selectedItem(item);
	}

	/**
	 * initialize the application
	 * @return {void}
	 */
	function initialize() {
		geocoder.geocode( { 'address': self.location}, function(results, status) {
			results = results[0];

			if (status == google.maps.GeocoderStatus.OK) {

				showLocation(results.geometry.location);
				getItems(results.geometry.location);

			} else {
				alert('Geocode was not successful for the following reason: ' + status);
			}
		});
	}

	/**
	 * centers the map based on a lat and lng
	 * @param  {object} latLng 
	 * @return {void}
	 */
	function showLocation(latLng) {
		 map.setCenter(latLng);
	}

	/**
	 * gets a ist of places using google nearby search
	 * @param  {object} latLng
	 * @return {void}
	 */
	function getItems(latLng) {
		var request = {
			location: latLng,
			radius: 20000,
			types: ['cafe']
		};

		var placeService = new google.maps.places.PlacesService(map);

		placeService.nearbySearch(request, function(results,status) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {

				for (var i = 0; i < results.length; i++) {

					getFoursquareData(results[i]);

					// show details if data exists
					if(results.length > 0) {
						self.isListVisible(true);

					} else {
					self.isListVisible(false)
					}
				}
			}
		});
	}

	/**
	 * get forsquare data
	 * @param  {[object}
	 * @return {void}
	 */
	function getFoursquareData(place) {

		var fsBaseURL = 'https://api.foursquare.com/v2/venues/search?v=20150402';
  		var fsID = '&client_id=GLWBEF0IKJ3IVN3QC01QKS4E505PT5HJWC1PTVMADLQTYMKR&client_secret=IMHT302C2W2IRRV0IOSTZDAN5M0I34Q1HNBTIPLNHEUX5ZXW';
  		var attributes = '&intent=match&limit=1&ll=' + place.geometry.location.k + ',' + place.geometry.location.D;
  		var query = '&query=' + place.name;
  		var fsURL = fsBaseURL + fsID + '&v=20130815&venuePhotos=1' + attributes + query;

  		$.ajax({
  			url: fsURL,
  			success: function(data) {

  				var fsData = data.response.venues[0];

				self.items.push({
					id: place.id,
					name: place.name,
					address: getStreet(place.vicinity),
					phone: getPhone(fsData.contact),//'(205) xxx-xxxx',
					rating: place.rating,
					fsURL: 'https://foursquare.com/v/' + fsData.name + '/' + fsData.id,
					marker: createMarker(place)
				});
			},
      		error: function( data ) {
      			self.items.push({
					id: place.id,
					name: place.name,
					address: getStreet(place.vicinity),
					phone: 'foursquare: Data Not Available',
					rating: place.rating,
					fsURL: 'https://foursquare.com/',
					marker: createMarker(place)
				});
      		}	     		
		});
	}

	/**
	 * get phone number 
	 * @param  {object} data
	 * @return {string}
	 */
	function getPhone(data) {
		if(!!data.formattedPhone) {
			return data.formattedPhone;
		}else {
			return 'No Phone Available';
		}
	}

	/**
	 * get street information from address
	 * @param  {string} address
	 * @return {string}
	 */
	function getStreet(address) {
			var firstComma = address.indexOf(',');
			var street = address.slice(0, firstComma) + '.';
			return street;
	}

	/**
	 * create a google map marker
	 * @param  {object} place
	 * @return {object}
	 */
	function createMarker(place) {

		var marker = new google.maps.Marker({
			position: place.geometry.location,
			title: place.name,
			map: map,
			icon: new google.maps.MarkerImage(place.icon,null,null,null,new google.maps.Size(30, 30))
		});

		google.maps.event.addListener(marker, 'click', function() {
				// get item for selected marker
			var selectedItem = ko.utils.arrayFirst(self.items(), function(item) {
				 return item.id === place.id;
			});
				
				// select the item
			self.selectItem(selectedItem);
		});

		return marker;
	}

	/**
	 * show marker info window
	 * @param  {object} item
	 * @return {void}
	 */
	function showinfoWindow(item) {

		// if window is currently open then close it
		if (infowindow) {
				infowindow.close();
		}
		
		// if item contains an ID then show content
		if(!!item.id) {
			// scroll to selected item
			document.getElementById(item.id).scrollIntoView();

			// set info window content and display
			infowindow.setContent(infoWindowContent(item));
			infowindow.open(map, item.marker);
		}

	}

	/**
	 * create info window content
	 * @param  {object} item
	 * @return {string}
	 */
	function infoWindowContent(item){
		var markerInfo = '<div class="item-infowindow">'
			+ '<div class="pull-left"><strong>' + item.name + '</strong></div><div class="text-right">' 
			+ '<a href="' + item.fsURL + '" target="_blank"><i class="fa fa-lg fa-foursquare"></i></a></div>'
			+ '<div>' + item.address + '</div>'
			+ '<div>' + item.phone + '</div>'
			+ '</div>';
		return markerInfo;
	}

	/**
	 * initialize
	 */
	initialize();
}

$(function() {
	// initialize viewModel 
	ko.applyBindings(new viewModel());
});