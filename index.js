'use strict';

const express = require('express');
const bodyParser = require('body-parser');
var helper = require('./helper');
var placesAPI = 'AIzaSyCjuvR8Wfdzg2e3EVmU30Lun8hcmxyeSLo';
var directionsAPI = 'AIzaSyDBuY63041R_cpalQykTqpuFRvm_zz1EKA';
var geocodingAPI = 'AIzaSyDWk0jqpQ0UTAMIO9zKw6O8UrSHGfwjpts';
var ipinfoAPI = '06fa9a46e07d49f65936a81ee009395ffc07bd437c9f71ee74371135406605ca';

const restService = express();

restService.use(bodyParser.urlencoded({
    extended: true
}));

restService.use(bodyParser.json());

// My Location: 40.48850079103278, -74.43782866001129
var speech = '';
var lat;
var lng;

helper.ipInfo();

restService.post('/bot', function(req, res) {
    var json = req.body.result;
    console.log("1");
    var action = json.action;
    switch (action)
    {
        case 'type.name': 
            type_name(json, res);
            break;
        case 'type.info': 
            type_info(json, res);
            break;
        case 'text.search': 
            text_search(json, res);
            break;
        case 'user.location': 
            user_location(res);
            break;
        default:
            console.log("This will never be the case!");
    }
});

function type_name(json, res) 
{
    var url;
    var type = json.parameters.type;
    var withRadius = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+lng+'&radius=5000&rankby=prominence&type='+type+'&key='+placesAPI;
    var withoutRadius = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+lng+'&rankby=distance&type='+type+'&key='+placesAPI;
    if (json.parameters.rankby == 'prominence')
    {
        speech = "Based on prominence: ";
        url = withRadius;
    }
    else
    {
        speech = "Based on distance: ";
        url = withoutRadius;
    }
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        for (var i = 0; i < 5 && i < result.results.length; i++)
            speech += "\n" + (i + 1) + ". " + result.results[i].name + " | " + result.results[i].vicinity;
        helper.returnSpeech(res, speech);
    });
};

function type_info(json, res) 
{
    var keyword = json.parameters.type_original;
    keyword.replace(/ /g, "+").replace(/\?/g, "");
    var url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+lng+'&rankby=distance&keyword='+keyword+'&key='+placesAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        var placeId = result.results[0].place_id;
        url = 'https://maps.googleapis.com/maps/api/place/details/json?placeid='+placeId+'&key='+placesAPI;
        helper.httpsGet(url, function(response) {
            result = JSON.parse(response);
            var name = result.result.name;
            // json.parameters.type_original + " - " + 
            if (json.parameters.json_key === 'rating')
            {
                var rating = result.result.rating;
                speech = "Rating of " + name + ": " + rating;
            }
            else if (json.parameters.json_key === 'website')
            {
                var website = result.result.website;
                speech = "Website of " + name + ": " + website;
            }
            else if (json.parameters.json_key === 'international_phone_number')
            {
                var international_phone_number = result.result.international_phone_number;
                speech = "Contact of " + name  + ": " + international_phone_number;
            }
            else if (json.parameters.json_key === 'formatted_address')
            {
                var formatted_address = result.result.formatted_address;
                speech = "Address of " + name + ": " + formatted_address;
            }
            else if (json.parameters.json_key === 'opening_hours')
            {
                if (result.result.opening_hours === undefined) speech = "I'm not sure if they're open. Sorry!";
                else
                {
                    var opening_hours = result.result.opening_hours.open_now;
                    if (opening_hours) speech = json.parameters.type_original + " is open now."; // replace()
                    else speech = name /*json.parameters.type_original*/ + " is closed now.";
                }
            }
            else if (json.parameters.json_key === 'reviews')
            {
                var reviews = '';
                for (var i = 0; i < result.result.reviews.length && i < 3; i++)
                    if (result.result.reviews[i].text)
                    {
                        reviews += "\n" + (i + 1) + ". Name: " + result.result.reviews[i].author_name + " | Rating: " + result.result.reviews[i].aspects[0].rating;
                        reviews += "\nReview: " + result.result.reviews[i].text;                
                    }
                speech = "Reviews of " + name + ":";
                speech += reviews;
            }
            // var photos;
            helper.returnSpeech(res, speech);
        });
    });
}

function text_search(json, res) 
{
    var phrase = json.parameters.phrase;
    phrase.replace(/ /g, "+").replace(/\?/g, "");
    speech = "I hope this is helpful:\n";
    var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+phrase+'&key='+placesAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        for (var i = 0; i < 5 && i < result.results.length; i++)
            speech += "\n" + (i + 1) + ". " + result.results[i].name + " | " + result.results[i].formatted_address;
        helper.returnSpeech(res, speech);
    });
}

function html_directions_driving(json, res) 
{
    var source = json.parameters.directions.source;
    var destination = json.parameters.directions.destination;
    speech = "Directions provided by Google:\n\n";
    var url = 'https://maps.googleapis.com/maps/api/directions/json?origin='+source+'&destination='+destination+'&key='+directionsAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        var localJson = result.routes[0].legs[0].steps;
        for (var i = 0; i < localJson.length; i++) 
        {
            var index = i + 1;
            var inst = (localJson[i].html_instructions).replace(/<b>/g, "").replace(/<\/b>/g, "").replace(/<\/div>/g, "").replace(/<div style="font-size:0.9em">/g, ". ");
            speech += index + ". " + inst + " for " + localJson[i].distance.text + ".\n";
        }
        speech += "The total travel time is " + result.routes[0].legs[0].duration.text;
        helper.returnSpeech(res, speech);
    });
}

function html_directions_transit(json, res) 
{
    var source = json.parameters.directions.source;
    var destination = json.parameters.directions.destination;
    var url = 'https://maps.googleapis.com/maps/api/directions/json?mode=transit&transit_mode=train&origin='+source+'&destination='+destination+'&key='+directionsAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        var speech = "Directions provided by Google\n\n";
        var jsonOne = result.routes[0].legs[0].steps;
        for (var i = 0; i < jsonOne.length; i++) 
        {
            var index = i + 1;
            speech += index + ". " + jsonOne[i].html_instructions + "\n";
            if (jsonOne[i].travel_mode === "WALKING") // if ((jsonOne[i].html_instructions).search("Walk") != -1)
            {
                var jsonTwo = jsonOne[i].steps;
                for (var j = 0; j < jsonTwo.length; j++)
                {
                    if (jsonTwo[j].html_instructions === undefined) continue;
                    var inst = (jsonTwo[j].html_instructions).replace(/<b>/g, "").replace(/<\/b>/g, "").replace(/<\/div>/g, "").replace(/<div style="font-size:0.9em">/g, ". ");
                    speech += "-> " + inst + " (" + jsonTwo[j].distance.text + ")\n";
                }
            }
            else if (jsonOne[i].travel_mode === "TRANSIT")
            {
                var jsonTwo = jsonOne[i].transit_details;
                speech += "-> Line name: " + jsonTwo.line.name + "\n";
                speech += "-> Number of stops: " + jsonTwo.num_stops + "\n";
                speech += "-> Departure Stop: " + jsonTwo.departure_stop.name + "\n";
                speech += "-> Departure Time: " + jsonTwo.departure_time.text + "\n";
                speech += "-> Arrival Stop: " + jsonTwo.arrival_stop.name + "\n";
                speech += "-> Arrival Time: " + jsonTwo.arrival_time.text + "\n";
            }
        }
        speech += "The total travel time is " + result.routes[0].legs[0].duration.text;
        helper.returnSpeech(res, speech);
    });
}

function user_location(res)
{
    speech = "You are currently here:\n";
    var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+lat+','+lng+'&key='+geocodingAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        speech += result.results[0].formatted_address;
        helper.returnSpeech(res, speech);
    });
}

restService.listen((process.env.PORT || 8000), function() {
    console.log("Server up and listening");
});
