'use strict';

const express = require('express');
const bodyParser = require('body-parser');
var helper = require('./helper');
var ipinfoAPI = '06fa9a46e07d49f65936a81ee009395ffc07bd437c9f71ee74371135406605ca';
var placesAPI = 'AIzaSyCjuvR8Wfdzg2e3EVmU30Lun8hcmxyeSLo';
var directionsAPI = 'AIzaSyDBuY63041R_cpalQykTqpuFRvm_zz1EKA';
var geocodingAPI = 'AIzaSyDWk0jqpQ0UTAMIO9zKw6O8UrSHGfwjpts';
var nearestRoadsAPI = 'AIzaSyB6NH1Sdv6K7rCc0JkONcV8e4pu-yF_YpE'

const restService = express();

restService.use(bodyParser.urlencoded({
    extended: true
}));

restService.use(bodyParser.json());

// My Location: 40.48850079103278, -74.43782866001129
var speech = '';
var lat;
var lng;
var head = ["I hope you find this helpful :)\n", "Here you go ;)\n", "I found these for you :D\n", "You might wanna check these out :P\n"];
var zero = ["I don't have an answer for your question :(", "Well, I tried everything I could but to no avail. :|", "Seems to me like there's something wrong with your request. How about you try a different one? :P", "Oops, I couldn't find anything! :("];

// var str = "airport movie_theater restaurant hindu_temple doctor accounting amusement_park aquarium art_gallery atm bakery bank bar beauty_salon bicycle_store book_store bowling_alley bus_station cafe campground car_dealer car_rentel car_repair car_wash casino cemetery church city_hall clothing_store convenience_store courthouse department_store dentist electrician electronics_store embassy fire_station florist funeral_home furniture_store gas_station gym hair_care hardware_store home_goods_store hospital insurance_agency jewelry_store laundry lawyer library liquor_store local_government_office locksmith lodging meal_delivery meal_takeaway mosque movie_rentel moving_company museum night_club painter park parking pet_store pharmacy physiotherapist plumber police post_office real_estate_agency roofing_contractor rv_park school shoe_store shopping_mall spa stadium storage store subway_station synagogue taxi_stand train_station transit_station travel_agency university veterinary_care zoo";

ipInfo();

restService.post('/bot', function(req, res) {
    var json = req.body.result;
    console.log("1");
    var action = json.action;
    switch (action)
    {
        case 'type.name':
            type_name(json, res);
            /*if (str.includes(json.parameters.type)) type_name(json, res);
            else 
            {
                speech = "I cannot answer something I have absolutely no idea about! If you want to search for a specific place, please type \"Specific requests\".";
                helper.returnSpeech(res, speech);
            }*/
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
        case 'nearest.roads':
            nearest_roads(res);
            break;
        default:
            console.log("This will never be the case!");
    }
});

function type_name(json, res) 
{
    var url;
    var type = json.parameters.type;
    type.replace(/ /g, "+").replace(/\?/g, "");
    // what if type not in the list?
    var withRadius = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+lng+'&radius=5000&rankby=prominence&type='+type+'&keyword='+type+'&key='+placesAPI;
    var withoutRadius = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+lng+'&rankby=distance&type='+type+'&keyword='+type+'&key='+placesAPI;
    if (json.parameters.rankby == 'prominence') url = withRadius;
    else url = withoutRadius;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        if (result.results.length == 0) helper.returnSpeech(res, "I don't have an answer for your question :(");
        if (result.results.length < 3) speech = "I could find only " + result.results.length + ":\n";
        else
        {
            if (json.parameters.rankby == 'prominence') speech = "Here are some of the most prominent ones:\n";
            else speech = "Here are some of the nearest ones:\n";
        }
        for (var i = 0; i < 5 && i < result.results.length; i++)
            speech += "\n\n" + (i + 1) + ". " + result.results[i].name + " | " + result.results[i].vicinity;
        helper.returnSpeech(res, speech);
    });
}

function text_search(json, res) 
{
    var phrase = json.parameters.phrase;
    phrase.replace(/ /g, "+").replace(/\?/g, "");
    // need i use location?
    // var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?location='+lat+','+lng+'&query='+phrase+'&key='+placesAPI;
    var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+phrase+'&key='+placesAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        var x = Math.floor(Math.random() * head.length);
        if (result.results.length == 0) helper.returnSpeech(res, "I don't have an answer for your question :( Perhaps you might want to ask a more precise question!");
        if (result.results.length < 3) speech = "I could find only " + result.results.length + ":\n";
        else speech = head[x];
        for (var i = 0; i < 5 && i < result.results.length; i++)
            speech += "\n\n" + (i + 1) + ". " + result.results[i].name + " | " + result.results[i].formatted_address;
        helper.returnSpeech(res, speech);
    });
}


function type_info(json, res) 
{
    var keyword = json.parameters.type_original;
    keyword.replace(/ /g, "+").replace(/\?/g, "");
    // var url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat+','+lng+'&rankby=distance&keyword='+keyword+'&key='+placesAPI;
    var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query='+keyword+'&key='+placesAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        var x = Math.floor(Math.random() * head.length);
        if (result.results.length == 0) helper.returnSpeech(res, zero[x]);
        else 
        {
            var placeId = result.results[0].place_id;
            url = 'https://maps.googleapis.com/maps/api/place/details/json?placeid='+placeId+'&key='+placesAPI;
            helper.httpsGet(url, function(response) {
                result = JSON.parse(response);
                if (result.result === undefined) helper.returnSpeech(res, zero[x]);
                else 
                {
                    var name = result.result.name;
                    var jsonKey = json.parameters.json_key;
                    switch (jsonKey)
                    {
                        case 'rating':
                        {
                            var rating = result.result.rating;
                            speech = "Rating of " + name + ": " + rating;
                            break;
                        }

                        case 'website':
                        {
                            var website = result.result.website;
                            speech = "Website of " + name + ": " + website;
                            break;
                        }

                        case 'international_phone_number':
                        {
                            var international_phone_number = result.result.international_phone_number;
                            speech = "Contact of " + name  + ": " + international_phone_number;
                            break;
                        }    

                        case 'formatted_address':
                        {
                            var formatted_address = result.result.formatted_address;
                            speech = "Address of " + name + ": " + formatted_address;
                            break;
                        }

                        case 'opening_hours':
                        {
                            if (result.result.opening_hours === undefined) speech = "I'm not really sure if they're open. Sorry! Perhaps you'd like to know about other places?";
                            else
                            {
                                var opening_hours = result.result.opening_hours.open_now;
                                if (opening_hours) speech = name + " is open now."; // replace()
                                else speech = name + " is closed now.";
                            }
                            break;
                        }

                        case 'reviews':
                        {
                            var reviews = '';
                            for (var i = 0; i < result.result.reviews.length && i < 3; i++)
                            if (result.result.reviews[i].text)
                            {
                                reviews += "\n" + (i + 1) + ". Name: " + result.result.reviews[i].author_name + " | Rating: " + result.result.reviews[i].aspects[0].rating;
                                reviews += "\nReview: " + result.result.reviews[i].text;                
                            }
                            speech = "Reviews of " + name + ":\n";
                            speech += reviews;
                            break;
                        }
                    
                        case 'photos':
                        {   
                            var x = Math.floor((Math.random() * result.result.photos.length));
                            var photo = result.result.photos[x].html_attributions[0];
                            var start = 9;
                            var end = photo.indexOf("\">");
                            var url = photo.substring(start, end);
                            speech = "\nClick the link: \n";
                            speech += url;
                            break;
                        }
                    }
                    helper.returnSpeech(res, speech);
                }
            });
        }
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

function nearest_roads(res)
{
    speech = "Road nearest to you:\n";
    var url = 'https://roads.googleapis.com/v1/nearestRoads?points='+lat+','+lng+'&key='+nearestRoadsAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        console.log(result);
        var placeId = result.snappedPoints[0].placeId;
        url = 'https://maps.googleapis.com/maps/api/place/details/json?placeid='+placeId+'&key='+placesAPI;
        helper.httpsGet(url, function(response) {
            var result = JSON.parse(response);
            speech += result.result.formatted_address;
            helper.returnSpeech(res, speech);
        });
    });
}

function ipInfo()
{
    // public IP - mine: 69.116.29.239; 10R: 69.116.24.253
    // train station - 69.114.144.21
    // ruwireless - 128.6.37.122
    var url = 'https://api.ipinfodb.com/v3/ip-city/?format=json&ip=69.116.29.239&key='+ipinfoAPI;
    helper.httpsGet(url, function(response) {
        var result = JSON.parse(response);
        lat = result.latitude - 0.05120124888;
        lng = result.longitude - (-0.02870008602);
    });
}

restService.listen((process.env.PORT || 8000), function() {
    console.log("Server up and listening");
});
