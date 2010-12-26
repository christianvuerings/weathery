
// We wouldn't want to clutter the global namespace, do we?
(function(){
    
    const consts = {
        "MILES_TO_KM": 1.609344,
        "NAME_PREFIX": "weathery-",
        "URL_YQL": "http://query.yahooapis.com/v1/public/yql?q=__QUERY__&format=json&callback="
    };
    
    /**
     * Convert miles/hour to km/hour
     * @param {Number} miles The number of miles you want to convert
     * @return {Number} Return the number in km/hour
     */
    var convertMilesToKm = function(miles) {
        return Math.round(miles * consts.MILES_TO_KM);
    }
    
    /**
     * Create a valid YQL URL by passing in a query
     * @param {String} query The query you want to convert into a valid yql url
     * @return {String} A valid YQL URL
     */
    var createYqlUrl = function(query) {
        return consts.URL_YQL.replace("__QUERY__", encodeURIComponent(query));
    }
    
    var createId = function(id){
        return consts.NAME_PREFIX + id;
    }
    
    /**
     * Get the largest flickr photo that's available
     * @param {Object} photo A flickr photo object 
     * @return {String} The URL of the largest size available for a specific picture
     */
    var getLargestFlickrPhoto = function(photo){
        if(photo.url_o){
            return photo.url_o;
        } else if (photo.url_l){
            return photo.url_l;
        } else if (photo.url_m) {
            return photo.url_m;
        }
    }
    
    /**
     * We load a random flickr image based on the condition of the weather
     * @param {String} flickr_url URL to the flickr api with the correct condition
     */
    loadFlickrWidget = function(flickr_url){
        
        $.ajax({
            "url": flickr_url,
            "success": function(data){

                if(data.query.count==0) {
                    $.log("No images were found.");
                    return;
                }

                // Find a random picture in the search results
                var randomPhoto = $.randomArrayItem(data.query.results.photo);

                $("html").css({
                    "background-image": "url(" + getLargestFlickrPhoto(randomPhoto) + ")"
                });
            }
        });
        
    }
    
    var parseGoogleData = function(data){
        var current_condition = data.query.results.xml_api_reply.weather.current_conditions;
        var wind_data = current_condition.wind_condition.data;
        var int_pattern=/[0-9]+/g;
        var mpg_pattern=/[0-9]+ mph/g;
        data.query.results.xml_api_reply.weather.current_conditions.wind_condition.data = 
            wind_data.replace(mpg_pattern,
                convertMilesToKm(wind_data.match(int_pattern))
                + " km/h");

        data.query.results.xml_api_reply.weather.current_conditions.humidity.data=
            data.query.results.xml_api_reply.weather.current_conditions.humidity.data.replace(/humidity: /gi, "");

        data.query.results.xml_api_reply.weather.current_conditions.wind_condition.data=
            data.query.results.xml_api_reply.weather.current_conditions.wind_condition.data.replace(/wind: /gi, "");       

        return data;
    }
    
    var loadGoogleWidget = function() {

        var id = this.id;
        var widget_data = this.data;

        $.ajax({
            "url": this.api,
            "success": function(data){

                data = parseGoogleData(data);

                var widget = {
                    "id": id,
                    "name": widget_data.name,
                    "base_img_url": widget_data.base_img_url,
                    "data": data.query.results.xml_api_reply.weather
                };
                $.log(widget);
                $("#" + widget_data.template).tmpl(widget).appendTo("#container");
                
                var flickr_url = widget_data.flickr_url.replace(
                    "__CONDITION__", data.query.results.xml_api_reply.weather.current_conditions.condition.data.replace(/partly |mostly /gi, "")).
                        replace("__RANDOM_WORD__", $.randomArrayItem(widget_data.flickr_random_words));
                loadFlickrWidget(flickr_url);

            }
        });
        
    };

    var widgetsConfiguration = [
        {
            "id": "google",
            "method": loadGoogleWidget,
            "api": createYqlUrl('select * from xml where url="http://www.google.com/ig/api?weather=oostduinkerke"'),
            "data": {
                "template": "googleWidgetTemplate",
                "name": "Google Weather",
                "base_img_url": "http://www.google.com/",
                "flickr_url": createYqlUrl('select * from flickr.photos.search where text="__RANDOM_WORD__ __CONDITION__" and sort="relevance" and extras="url_o, url_l, url_m"'),
                "flickr_random_words": ["Beach", "Sea", "Catamaran"]
            }
        }
    ];

    var loadWidgets = function() {

        // TODO: check whether there is already an existing cookie
        var toLoadWidgets = ["google"];
        
        // Load all the widgets
        for(var i=0; i< widgetsConfiguration.length; i++) {
            if($.inArray(widgetsConfiguration[i].id, toLoadWidgets) > -1) {
                widgetsConfiguration[i].method();
            }
        }
        
    }

    /**
     * Initialise the weather page
     * It does the following tasks:
     *      
     * @returns void
     */
    var init = function(){
    
        loadWidgets();
    
    }

    // Main initialisation function
    init();

})();