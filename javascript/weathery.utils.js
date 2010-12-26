// Log function
(function(a){a.log=function(){if(window.console&&window.console.log){console.log.apply(window.console,arguments)}};a.fn.log=function(){a.log(this);return this}})(jQuery);

// Random function
(function($){
    $.randomArrayItem = function(arr){
        if($.isPlainObject(arr)){return arr};
        var i = Math.floor(arr.length * (Math.random() % 1));
        return arr[i];
    }
})(jQuery)