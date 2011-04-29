/*global $ */
(function(){

    var consts = {
        "DAYS": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "MILES_TO_KM": 1.609344,
        "MONTHS": ["Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "NAME_PREFIX": "weathery-",
        "WIDGET_TEMPLATE_STANDARD": "standardWidgetTemplate",
        "URL_YQL": "http://query.yahooapis.com/v1/public/yql?q=__QUERY__&env=store://datatables.org/alltableswithkeys&format=json&callback="
    };

    var $standardWidgetTemplate = $("#" + consts.WIDGET_TEMPLATE_STANDARD);
    var $container = $("#container");
    var $selectContainer = $("#selectContainer");
    var $selectContainerTemplate = $("#selectContainerTemplate");

    /**
     * Convert miles/hour to km/hour
     * @param {Number} miles The number of miles you want to convert
     * @return {Number} Return the number in km/hour
     */
    var convertMilesToKm = function(miles){
        return Math.round(miles * consts.MILES_TO_KM);
    };

    /**
     * Convert fahrenheit to celcius
     * @param {Number} miles The degrees in fahrenheit
     * @return {Number} Return the degrees in Celcius
     */
    var convertFahrenheitToCelius = function(fahrenheit){
        return Math.round((fahrenheit -32) * (5/9));
    };

    /**
     * Create a valid YQL URL by passing in a query
     * @param {String} query The query you want to convert into a valid yql url
     * @return {String} A valid YQL URL
     */
    var createYqlUrl = function(query){
        return consts.URL_YQL.replace("__QUERY__", encodeURIComponent(query));
    };

    var createId = function(id){
        return consts.NAME_PREFIX + id;
    };

    var removeFromId = function(id){
        return id.replace(consts.NAME_PREFIX, "");
    }

    var createWidgetContainer = function(id){
        data = {
            "id": createId(id)
        };
        if($container.has("#"+data.id).length === 0){
            $container.append($standardWidgetTemplate.tmpl(data));
        }
        return data.id;

    };

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
        } else if (photo.url_m){
            return photo.url_m;
        }
    };

    /**
     * We load a random flickr image based on the condition of the weather
     * @param {String} flickr_url URL to the flickr api with the correct condition
     */
    var loadFlickrWidget = function(flickr_url){

        $.ajax({
            "url": flickr_url,
            "success": function(data){

                if(parseInt(data.query.count, 10)===0){
                    $.log("No images were found.");
                    return;
                }

                // Find a random picture in the search results
                var randomPhoto = $.randomArrayItem(data.query.results.photo);

                $("html").css({
                    "background-image": "url(" + getLargestFlickrPhoto(randomPhoto) + ")"
                });
                $("body").removeClass("bodycolor");
            }
        });

    };

    var parseGoogleData = function(data){

        var current_condition = data.query.results.xml_api_reply.weather.current_conditions;
        var forecast_conditions = data.query.results.xml_api_reply.weather.forecast_conditions;
        var wind_data = current_condition.wind_condition.data;
        var int_pattern=/[0-9]+/g;
        var mpg_pattern=/[0-9]+ mph/g;
        data.query.results.xml_api_reply.weather.current_conditions.wind_condition.data =
            wind_data.replace(mpg_pattern,
                convertMilesToKm(wind_data.match(int_pattern))
                + " km/h");

        for(var i=0; i<forecast_conditions.length; i++){
            data.query.results.xml_api_reply.weather.forecast_conditions[i].low.data = convertFahrenheitToCelius(forecast_conditions[i].low.data);
            data.query.results.xml_api_reply.weather.forecast_conditions[i].high.data = convertFahrenheitToCelius(forecast_conditions[i].high.data);
        }

        data.query.results.xml_api_reply.weather.current_conditions.humidity.data=
            current_condition.humidity.data.replace(/humidity: /gi, "");

        data.query.results.xml_api_reply.weather.current_conditions.wind_condition.data=
            current_condition.wind_condition.data.replace(/wind: /gi, "");

        return data;

    };

    var loadGoogleWidget = function(){

        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

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
                $("#" + container_id).html($("#" + widget_data.template).tmpl(widget));

                var flickr_url = widget_data.flickr_url.replace(
                    "__CONDITION__", data.query.results.xml_api_reply.weather.current_conditions.condition.data.replace(/partly |mostly /gi, "")).
                        replace("__RANDOM_WORD__", $.randomArrayItem(widget_data.flickr_random_words));
                loadFlickrWidget(flickr_url);

            }
        });

    };

    var parseWundergroundData = function(data){

        data.query.results.results[0].current_observation.wind_kmph = convertMilesToKm(data.query.results.results[0].current_observation.wind_mph);

        return data;
    };

    /**
     * Load the Wunderground widget
     */
    var loadWundergroundWidget = function(){

        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

        $.ajax({
            "url": this.api,
            "success": function(data){

                if(data && data.query && parseInt(data.query.count, 10) > 0){

                    data = parseWundergroundData(data);

                    var widget = {
                        "id": id,
                        "name": widget_data.name,
                        "data0": data.query.results.results[0].current_observation,
                        "data1": data.query.results.results[1].forecast.simpleforecast
                    };

                    $("#" + container_id).html($("#" + widget_data.template).tmpl(widget));

                } else {
                    $("#" + container_id).remove();
                }

            }
        });

    };

    /**
     * Load an iframe widget
     */
    var loadIframeWidget = function(){
        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

        $("#" + container_id).html($("<h2>" + widget_data.name + "</h2>"));
        $("#" + container_id).append($("<iframe />").attr(widget_data.iframe));
    };

    /**
     * Load an image widget
     */
    var loadImageWidget = function(){
        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

        $("#" + container_id).html($("<h2>" + widget_data.name + "</h2>"));
        $("#" + container_id).append('<img src="' + widget_data.img + '" />');
    };

    /**
     * Load a live image widget
     */
    var loadLiveImageWidget = function(){
        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

        $("#" + container_id).html($("<h2>" + widget_data.name + "</h2>"));
        $("#" + container_id).append('<img src="' + widget_data.img + '" width="660" />');

        var date;

        window.setInterval(function(){
            date=new Date();
            $("#" + container_id + " img").attr("src", widget_data.img + "?rand=" + date.getTime());
        },1000);
    };

    /**
     * Load an mummtides widget
     */
    var loadMummtidesWidget = function(){
        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

        $.ajax({
            "url": this.api,
            "success": function(data){

                if(data.query.count){

                    var test="";

                    for(var i=0;i<data.query.results.rss.channel.item.length;i++){
                        test += data.query.results.rss.channel.item[i].description;
                    }

                    $("#" + container_id).html($("<h2>" + widget_data.name + "</h2>"));
                    $("#" + container_id).append(test);

                } else {
                    $("#" + container_id).remove();
                }

            }
        });
    };

    /**
     * Load the Meteo Widget
     */
    var loadMeteoWidget = function(){
        var id = this.id;
        var widget_data = this.data;

        var container_id = createWidgetContainer(id);

        var data = [], date;

        for(var i=0; i<4; i++){
            date = new Date();
            date.setDate(date.getDate() + i);
            data.push({
                "url": widget_data.img_base_url.replace("__DATE__", date.getFullYear() + "_" + (date.getMonth()+1) + "_" + date.getDate()),
                "name": consts.DAYS[date.getDay()] + " " + date.getDate() + " " + consts.MONTHS[date.getMonth()]
            });
        }

        var widget = {
            "id": id,
            "name": widget_data.name,
            "data": data
        };

        // Put the weathercontainer in a separate variable, this makes it load faster (caching selectors)
        var $weathercontainer = $("#" + container_id);
        $weathercontainer.html($("#" + widget_data.template).tmpl(widget));

        // Add bindings
        $(".weathery-meteo-links a", $weathercontainer).bind("mouseenter", function(){
            // First hide all the images and then show the appropriate one
            $($(".weathery-meteo-images img", $weathercontainer).hide()[parseInt(this.className, 10)-1]).show();
        })
    };

    var parseTideDataEntry = function(entry){
        var outputentry = $.trim(entry).replace("Hoogwater: ", "").replace("Laagwater: ", "").replace(/u/g, ":");

        // Check whether it ends on "en"
        if(outputentry.substr(-2) === "en"){
            outputentry = outputentry.replace(" en", "");
        } else {
            outputentry = outputentry.replace(" en ", " - ");
        }
        return outputentry;
    };

    var parseTideData = function(data){

        var todayarr = data.query.results.results[0].body.p.content.split('\n');
        var tomorrowarr = data.query.results.results[1].body.p.content.split('\n');

        var outputdata = {
            "today": {
                "hightide": parseTideDataEntry(todayarr[2]),
                "lowtide": parseTideDataEntry(todayarr[4])
            },
            "tomorrow":{
                "hightide": parseTideDataEntry(tomorrowarr[2]),
                "lowtide": parseTideDataEntry(tomorrowarr[4])
            }
            
        }
    
        return outputdata;
    };

    /**
     * Load the tide widget
     */
    var loadTideWidget = function(){
        var id = this.id;
        var widget_data = this.data;
        
        var date = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(date.getDate()+1);
        var api = createYqlUrl('SELECT * FROM yql.query.multi WHERE queries=\'select * from html where url="' + this.api + '?loc=4&dag=' + $.zeropadding(date.getDate()) + '&maand=' + $.zeropadding(date.getMonth()+1) + '&jaar=' + date.getFullYear() + '"; select * from html where url="' + this.api + '?loc=4&dag=' + $.zeropadding(tomorrow.getDate()) + '&maand=' + $.zeropadding(tomorrow.getMonth()+1) + '&jaar=' + tomorrow.getFullYear() + '"\'');

        var container_id = createWidgetContainer(id);
        
        $.ajax({
            "url": api,
            "success": function(data){

                if(data && data.query && parseInt(data.query.count, 10) > 0){

                    data = parseTideData(data);

                    var widget = {
                        "id": id,
                        "name": widget_data.name,
                        "data": data
                    };

                    $("#" + container_id).html($("#" + widget_data.template).tmpl(widget));

                } else {
                    $("#" + container_id).remove();
                }

            }
        });
    };

    var widgetsConfiguration = [
        /*{
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
        },*/
        {
            "id": "wunderground",
            "method": loadWundergroundWidget,
            "api": createYqlUrl('SELECT * FROM query.multi WHERE queries=\'select * from wunderground.currentobservation where location="Koksijde, Belgium"; select * from wunderground.forecast where location="Koksijde, Belgium"\''),
            "data": {
                "template": "wundergroundWidgetTemplate",
                "name": "Wunderground Weather"
            }
        },
        {
            "id": "rainfallradar",
            "method": loadIframeWidget,
            "data": {
                "iframe": {
                    "scrolling": "no",
                    "height": "513px",
                    "frameborder": "no",
                    "width": "550px",
                    "src": "http://mijn.buienradar.nl/lokalebuienradar.aspx?voor=1&lat=51.11433&x=1&y=1&lng=2.68463&overname=2&zoom=9&naam=oostduinkerke&size=3&map=1"
                },
                "name": "Rainfall Radar"
            }
        },
        {
            "id": "zoetgenot",
            "method": loadLiveImageWidget,
            "data": {
                "iframe": {
                    "scrolling": "no",
                    "height": "519px",
                    "frameborder": "no",
                    "width": "651px",
                    "src": "http://www.infometeo.be/allcams/campage5.php"
                },
                "img":"http://178.118.14.22:8020/record/current.jpg",
                "name": "Zoet genot Webcam"
            }
        },
        {
            "id": "windfinder",
            "method": loadIframeWidget,
            "data":{
                "iframe": {
                    "scrolling": "no",
                    "height": "885px",
                    "frameborder": "no",
                    "width": "900px",
                    "src": "http://www.windfinder.com/wind-cgi/forecast_print_hires.pl?STATIONSNR=koksijde"
                },
                "name": "Windfinder"
            }
        },
        {
            "id": "mummtides",
            "method": loadMummtidesWidget,
            "api": createYqlUrl('select channel from xml where url="http://www.mumm.ac.be/NL/Models/Operational/Tides/rss.php?koksijde"'),
            "data": {
                "name" : "Mumm.ac.be tides",
                "template": "mummtidesWidgetTemplate"
            }
        },
        /*
        {
            "id": "tideinfo",
            "method": loadTideWidget,
            "api": "http://www.agentschapmdk.be/getij.php",
            "data": {
                "name": "Tide Info",
                "template": "tideWidgetTemplate"
            }
        },
        */
        {
            "id": "meteoonline",
            "method": loadMeteoWidget,
            "data": {
                "img_base_url": "http://webservice-nl-be.weeronline.nl/digits_map/Oostduinkerke/131/__DATE__/sail_map300",
                "template": "meteoWidgetTemplate",
                "name": "MeteoVista Sailing"
            }
        },
        {
            "id": "meteowind",
            "method": loadMeteoWidget,
            "data": {
                "img_base_url": "http://webservice-nl-be.weeronline.nl/digits_map/Oostduinkerke/131/__DATE__/wind_map300",
                "template": "meteoWidgetTemplate",
                "name": "MeteoVista Wind"
            }
        },
        {
            "id": "meteouv",
            "method": loadMeteoWidget,
            "data": {
                "img_base_url": "http://webservice-nl-nl.weeronline.nl/digits_map/Oostduinkerke/131/__DATE__/uv_map300",
                "template": "meteoWidgetTemplate",
                "name": "MeteoVista UV"
            }
        },
        {
            "id": "infometeowind",
            "method": loadImageWidget,
            "data": {
                "img":"http://www.infometeo.be/wxhistshort.php?s=km",
                "name": "Infometeo Koksijde Wind"
            }
        },
        {
            "id": "sycodinfo",
            "method": loadImageWidget,
            "data": {
                "img":"http://www.sycod.be/FTP/weather/broadcastsycod.jpg",
                "name": "Sycod Info"
            }
        }
    ];

    /**
     * Find a widget with a specific id
     */
    var findWidget = function(widgetid){

        for(var i=0; i< widgetsConfiguration.length; i++){
            if(widgetsConfiguration[i].id === widgetid){
                return widgetsConfiguration[i];
            }
        }
        return null;

    }

    /**
     * Get which widgets the users has previously disabled
     */
    var getDisabledWidgets = function(){

        if(localStorage.getItem('disabledWidgets')){
            return JSON.parse(localStorage.getItem('disabledWidgets'));
        }
        return null;

    };

    /**
     * Save the disabled widgets to the localstorage
     * @param {Array} widgets An array containing the widgets that the user doesn't want to load next time
     */
    var saveWidgets = function(widgets){
        localStorage.setItem('disabledWidgets', JSON.stringify(widgets));
    };

    var saveDisabledWidgets = function(){
        var widgets = [];

        $("li:not(.selectContainer_loaded)", $selectContainer).each(function(){
            widgets.push(this.id.replace("selectContainer_item_", ""));
        });

        saveWidgets(widgets);
    }

    /**
     * Load the appropriate widgets
     */
    var loadWidgets = function(){

        var savedWidgets = getDisabledWidgets();

        // Load all the widgets
        for(var i=0; i< widgetsConfiguration.length; i++){
            if(!savedWidgets || $.inArray(widgetsConfiguration[i].id, savedWidgets) === -1){
                try {
                    widgetsConfiguration[i].method();
                } catch(e){
                    $.log(widgetsConfiguration[i] + " couldn't be loaded.");
                }
            }
        }

        return savedWidgets;

    };

    /**
     * Load the select menu
     * @private
     * @param {Array} widgets A list of all the widgets that were selected by the user
     */
    var loadSelect = function(widgets){

        var widgetsData = [];

        // TODO replace this overhead
        for(var i=0; i< widgetsConfiguration.length; i++){
            widgetsData.push({
                "id": widgetsConfiguration[i].id,
                "name": widgetsConfiguration[i].data.name || "Undefined name",
                "loaded": !widgets || $.inArray(widgetsConfiguration[i].id, widgets) === -1 ? true : false,
            });
        }

        $("ul", $selectContainer).html($selectContainerTemplate.tmpl(widgetsData));

        $(">a", $selectContainer).click(function(){
            $("ul", $selectContainer).toggle();
        });

        $("li", $selectContainer).click(function(){
            var $element = $(this);
            var id = this.id.replace("selectContainer_item_", "");
            if($element.hasClass("selectContainer_loaded")){
                $("#" + createId(id)).remove();
                $element.removeClass("selectContainer_loaded");
            }
            else{
                findWidget(id).method();
                $element.addClass("selectContainer_loaded");
            }
            saveDisabledWidgets();
        });

    };

    /**
     * Initialise the weather page
     * It does the following tasks:
     *
     * @returns void
     */
    var init = function(){

        var widgets = loadWidgets();

        loadSelect(widgets);

    };

    // Main initialisation function
    init();

})();