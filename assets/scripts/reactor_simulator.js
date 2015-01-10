(function($) {
  var gridOptions = [
    { character: 'C', name: 'Gelid Cryotheum' },
    { character: 'E', name: 'Liquid Ender' },
    { character: 'D', name: 'Diamond Block' },
    { character: 'G', name: 'Graphite Block' },
    { character: 'R', name: 'Destabilized Redstone' },
    { character: 'X', name: 'Control Rod' },
    { character: 'O', name: 'Air' }
  ];

  // Used for local testing
  var SAMPLE_RESPONSE = {"fuelConsumption":0.2192493975162506,"output":31835.994140625,"fuelFertility":510.647,"coolantTemperature":20.0,"fuelHeat":750.65656,"reactorHeat":721.741};

  // Defines bounds for reactor sizes
  var MIN_SIZE = 1
      , MIN_HEIGHT = 1
      , MAX_SIZE = 30
      , MAX_HEIGHT = 46;

  // Defines bound for graphics sizes
  var MIN_CELL_SIZE = 20
      , MAX_CELL_SIZE = 60;

  // Used to dynamically resize cells so that it fits in the viewport
  var cellSize
      , maxReactorWidth
      , maxReactorHeight;

  /**
   * Add commas to a number. Taken from http://stackoverflow.com/questions/1990512/add-comma-to-numbers-every-three-digits-using-jquery
   */
  var addCommas = function(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  };

  /**
   * Encode/decode a string using run length encoding. Loosely based from: http://rosettacode.org/wiki/JavaScript
   */
  var rlencode = function(input) {
    return $.map(input.match(/(.)\1*/g), function(substr) {
      var r = '';
      if (substr.length > 1) {
        r += substr.length;
      }
      r += substr[0];
      return r;
    }).join('');
  };

  var rldecode = function(encoded) {
    // Extract tokens from encoded string. E.g., 32E, 12X, F
    var split = encoded.match(/(\d*.)/g);

    // From each token, append to the output.
    return $.map(split, function(token) {
      var tokenParts = token.match(/(\d*)(.)/);

      return new Array(1 + (tokenParts[1] == '' ? 1 : parseInt(tokenParts[1]))).join(tokenParts[2]);
    }).join('');
  };

  var setSizes = function () {
    maxReactorWidth = ($(document).width() - $('#reactor-controls').width() - 100)
    maxReactorHeight = ($(document).height() - $('.masthead').height() - 100);

    var reactorWidth = $('.grid-table tr:first td').length
        , reactorHeight = $('.grid-table tr').length
        , preferredCellWidth = maxReactorWidth / reactorWidth
        , preferredCellHeight = maxReactorHeight / reactorHeight;

    cellSize = Math.min(preferredCellWidth, preferredCellHeight, MAX_CELL_SIZE);
    cellSize = Math.max(cellSize, MIN_CELL_SIZE);

    $('.grid-table .texture').width(cellSize).height(cellSize);
  };

  var updateReactor = function(params) {
    var reactor = $('#reactor-area');
    reactor.data($.extend(reactor.data(), params));

    delete params['x'];
    delete params['z'];
    updateHashParams(params);

    if (reactor.data('activelyCooled')) {
      $('.passive-only').hide();
      $('.active-only').show();
    } else {
      $('.active-only').hide();
      $('.passive-only').show();
    }

    simulate();
  };

  var createReactor = function(x, z, height, activelyCooled, controlRodInsertion) {
    x = parseInt(x);
    z = parseInt(z);
    height = parseInt(height);
    activelyCooled = JSON.parse(activelyCooled);
    controlRodInsertion = parseInt(controlRodInsertion);

    updateReactor({
      x: x,
      z: z,
      height: height,
      activelyCooled: activelyCooled,
      controlRodInsertion: controlRodInsertion
    });

    var reactorArea = $('#reactor-area').html('');

    var gridTable = $('<table class="grid-table"></table>')

    for (var i = 0; i <= x+1; i++) {
      var gridRow = $('<tr></tr>');

      for (var j = 0; j <= z+1; j++) {
        var elmt = $('<td></td>');

        if (i == 0 || i == x+1 || j == 0 || j == z+1) {
          if ((i == 0 && j == 0) || (i == x+1 && j == 0) || (i == 0 && j == z+1) || (i == x+1 && j == z+1)) {
            elmt.append(getTextureImg('casing-corner'));
          } else if (i == 0 || i == x+1) {
            elmt.append(getTextureImg('casing-lr'));
          } else {
            elmt.append(getTextureImg('casing-ud'));
          }
          elmt.addClass('casing');
        } else {
          elmt.addClass('contents');
        }

        gridRow.append(elmt);
      }

      gridTable.append(gridRow);
    }
    $('#simulation-results').show();

    reactorArea.append(gridTable);
    setSizes();
  };

  var selectGridOption = function(char) {
    var selected = $('.grid-option')
        .removeClass('selected')
        .filter(function() { return $(this).data('character') == char; })
        .addClass('selected');
    $('#grid-selection').html(selected.data('name'));
  };

  var selectedGridOption = function() {
    return $('.grid-option.selected');
  };

  var getTextureImg = function(character) {
    var elmt = $('<div class="texture"></div>')
        .html('&nbsp;');

    if (character != 'O') {
      elmt.css('background-image', 'url(assets/textures/' + character + '.gif)');
    }

    return elmt;
  };

  var processCell = function(selected, update) {
    if (selected === undefined || selected === null) {
      selected = selectedGridOption();
    }

    if (update === undefined || update === null) {
      update = true;
    }

    if (selected.length == 0) {
      $('#error-area').html('Select a material first');
    } else {
      $(this)
          .html('')
          .data('character', selected.data('character'))
          .append(getTextureImg(selected.data('character')).width(cellSize).height(cellSize));

      if (update) {
        simulate();
      }
    }
  };

  var getLayoutStr = function() {
    var layout = "";

    $('.grid-table td.contents').each(function() {
      if ($(this).data('character') === undefined) {
        layout += 'O';
      } else {
        layout += $(this).data('character');
      }
    });

    return layout;
  };

  /* Adds UI-calculated fields to simulator response. */
  var augmentResponse = function(response) {
    var output = response['output'];
    var fuelUse = response['fuelConsumption'];
    var fuelEff = output / fuelUse;
    response['outputPerFuel'] = fuelEff;

    /* Interior sizes (no casing) */
    var x = parseInt($('#length').val());
    var z = parseInt($('#width').val());
    var y = parseInt($('#height').val());

    /* Exterior size (counts casing) */
    var blocks = (x + 2) * (z + 2) * (y + 2);
    response['outputPerBlock'] = output / blocks;
    response['outputPerFuelPerBlock'] = fuelEff / blocks;

    $.each(response, function(k, v) {
      response[k] = addCommas(Math.round(v * 100) / 100);
    });

    return response;
  };

  var displaySimulationResponse = function(response) {
    $('#error-area').html('');
    augmentResponse(response);
    $('li', $('#simulation-results')).each(function() {
      $('.value', this).html(response[$(this).data('for')]);
    });
    $('.loading-animation.simulation').hide();
  };

  var validateReactorSize = function() {
    try {
      var x = parseInt($('#length').val());
      var z = parseInt($('#width').val());
      var height = parseInt($('#height').val());

      if (isNaN(x) || isNaN(z) || isNaN(height)) {
        return "Invalid input";
      } else if (x < MIN_SIZE || x > MAX_SIZE || z < MIN_SIZE || z > MAX_SIZE) {
        return "Length/width must be between " + MIN_SIZE + " and " + MAX_SIZE;
      } else if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
        return "Height must be between " + MIN_HEIGHT + " and " + MAX_HEIGHT;
      }
    } catch (e) {
      return "Invalid input";
    }

    return true;
  };

  var validateReactor = function() {
    var hasControlRods = $('.grid-table td.contents')
        .filter(function() { return $(this).data('character') === 'X' })
        .length > 0;

    if (! hasControlRods) {
      return "Reactor must have at least one control rod.";
    }

    return true;
  };

  var simulate = function() {
    var reactorArea = $('#reactor-area')
        , params = reactorArea.data()
        , validationResult = validateReactor()
        , definition = {
          // Definitions are swapped from how they're interpreted in the simulator code.
          xSize: params.z + 2,
          zSize: params.x + 2,
          height: params.height + 2,
          layout: getLayoutStr(),
          isActivelyCooled: params.activelyCooled,
          controlRodInsertion: params.controlRodInsertion
        };

    if (validationResult !== true) {
      $('#error-area').html(validationResult);
      $('#simulation-results .value').html('-');
    } else {
      var loading = $('.loading-animation.simulation').show();

      if (window.location.origin === 'file://') {
        displaySimulationResponse(SAMPLE_RESPONSE);
        $('#error-area').html('This is a mock response. You should not be seeing this.');
      } else {
        $.getJSON('/api/simulate', {definition: JSON.stringify(definition)})
            .done(displaySimulationResponse)
            .fail(function (jqhxr, textStatus, err) {
              var error;
              if (err == 'Bad Gateway') {
                error = 'API unresponsive. May be restarting with updates.';
              } else {
                error = textStatus + ", " + err;
              }
              $('#error-area').html(error);
              loading.hide();
            }
        );
      }
    }
  };

  $(function() {
    setSizes();
    $(window).resize(setSizes);

    $.each(gridOptions, function(i, e) {
      var elmt = $('<div class="grid-option"></div>')
          .data('character', e.character)
          .data('name', e.name);
      elmt.append(getTextureImg(e.character));
      $('#controls-grid').append(elmt);
    });

    $('#new-reactor').click(function() { showPage('reactor-prompt'); });
    $('#create-reactor').click(function() { $('#reactor-prompt-form').submit(); });

    $('#reactor-prompt-form').submit(function() {
      var validationResult = validateReactorSize();

      if (validationResult === true) {
        var length = $('#length').val()
            , width = $('#width').val()
            , height = $('#height').val()
            , activelyCooled = $('#activelyCooled').is(':checked')
            , controlRodInsertion = $('#control-rod-insertion').slider('value');

        createReactor(length, width, height, activelyCooled, controlRodInsertion);

        // Prevent double-loading
        previousPage = 'reactor-design';

        showPage('reactor-design', {
          length: length,
          width: width,
          height: height,
          activelyCooled: activelyCooled,
          controlRodInsertion: controlRodInsertion
        });
      } else {
        $('#error-area').html(validationResult);
      }

      return false;
    });

    $('.grid-option').click(function() {
      selectGridOption($(this).data('character'));
    });

    var dragging = false
        , stopDragging = function() {
          dragging = false;
          updateHashParams({layout: rlencode(getLayoutStr())});
          simulate();
          return false;
        };

    $('body')
        .on('mousedown', '.grid-table td.contents', function () {
          dragging = true;
          processCell.call(this);
          updateHashParams({layout: rlencode(getLayoutStr())});
        })
        .on('mouseup', '.grid-table', stopDragging)
        .on('mouseenter', '.grid-table td.contents',
          function() {
            if (!dragging) {
              $(this).addClass('selected');
            } else {
              processCell.call(this, null, false);
            }
          })
        .on('mouseleave', '.grid-table td.contents', function() { $(this).removeClass('selected'); })
        .on('mouseleave', '.grid-table', stopDragging);

    $('#fill').click(function() {
      $('.grid-table td.contents').each(function() { processCell.call(this, null, false); });
      updateHashParams({layout: rlencode(getLayoutStr())});
      simulate();
    });

    $('#simulate').click(simulate);

    $('#new-design-cancel').click(function() {
      window.history.back();
    });

    $('#activelyCooled').change(function() {
      var activelyCooled = $(this).prop('checked');
      updateReactor({activelyCooled: activelyCooled });
    });

    $('.checkbox-label').click(function() {
      var c = $('input[type="checkbox"]', $(this).parent());
      c.prop('checked', !c.is(':checked'));
      c.trigger('change');
      return false;
    });

    var updateRodInsertion = function(e, ui) {
      $('#control-rod-insertion-value').html(ui.value + '%');
    };

    $('#control-rod-insertion').slider({
      min: 0,
      max: 100,
      value: 0,
      step: 1,
      slide: updateRodInsertion,
      stop: function (e, ui) {
        updateRodInsertion.call(this, e, ui);
        updateReactor({controlRodInsertion: ui.value});
      }
    });

    var parseReactorParams = function() {
      if (getHashLocation() == 'reactor-design') {
        var params = getHashParams();
        createReactor(params.length, params.width, params.height, params.activelyCooled, params.controlRodInsertion);

        $('#control-rod-insertion').slider('value', params.controlRodInsertion);
        $('#control-rod-insertion-value').html(params.controlRodInsertion + '%');
        $('#activelyCooled').prop('checked', JSON.parse(params.activelyCooled));

        if (params.layout !== undefined) {
          var decodedLayout = rldecode(params.layout);
          var gridCells = $('.grid-table td.contents');

          for (var i = 0; i < decodedLayout.length; i++) {
            var char = decodedLayout[i]
                , gridOption = $('.grid-option').filter(function () {
                  return $(this).data('character') == char;
                }).first();

            if (gridOption.length > 0) {
              processCell.call(gridCells.eq(i), gridOption, false);
            }
          }

          simulate();
        }
      }
    };
    var previousPage = getHashLocation();

    $(window).load(parseReactorParams);
    $(window).hashchange(function() {
      if (previousPage != 'reactor-design') {
        parseReactorParams();
      }
      previousPage = getHashLocation();
    });
  });
})(jQuery);
