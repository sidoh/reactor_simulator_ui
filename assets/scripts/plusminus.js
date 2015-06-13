(function($) {

  var valueCallback = function(callback, value) {
    return function() {
      callback.call(this, value);
    };
  };

  $.fn.plusminus = function(options) {
    options = $.extend({
      value: 1,
      callback: $.noop
    }, options);

    return this.each(function() {
      var plusBtn = $('<div></div>')
              .addClass('plusminus-plus')
              .html('+')
          , minusBtn = $('<div></div>')
              .addClass('plusminus-minus')
              .html('-')
          , label = $('<div></div>')
              .addClass('plusminus-label')
              .html($(this).data('label'))
          , value = $(this).data('value') || options.value;

      plusBtn.click(valueCallback(options.callback, value));
      minusBtn.click(valueCallback(options.callback, -value));

      var container = $('<div></div>')
          .addClass('plusminus-container')
          .append(plusBtn)
          .append(minusBtn);

      $(this)
          .append(container)
          .append(label);
    });
  };

})(jQuery);