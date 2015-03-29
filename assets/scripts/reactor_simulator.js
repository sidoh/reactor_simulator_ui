(function($) {
  var gridOptions = [
    { character: 'C', name: 'Gelid Cryotheum' },
    { character: 'E', name: 'Liquid Ender' },
    { character: 'D', name: 'Diamond Block' },
    { character: 'G', name: 'Graphite Block' },
    { character: 'R', name: 'Destabilized Redstone' },
    { character: 'X', name: 'Control Rod' },
    { character: 'L', name: 'Block of Gold' },
    { character: 'O', name: 'Air' }
  ];

  var materials = {
    redstone: { key: 'redstone', name: 'Redstone' },
    enderPearl: { key: 'enderPearl', name: 'Ender Pearl' },
    diamond: { key: 'diamond', name: 'Diamond' },
    cryotheum: { key: 'cryotheum', name: 'Cryotheum Dust' },
    snowball: { key: 'snowball', name: 'Snowball' },
    niter: { key: 'niter', name: 'Niter' },
    sandstone: { key: 'sandstone', name: 'Sandstone' },
    blizzPowder: { key: 'blizzPowder', name: 'Blizz Powder' },
    graphiteBar: { key: 'graphiteBar', name: 'Graphite Bar' },
    charcoal: { key: 'charcoal', name: 'Charcoal' },
    gravel: { key: 'gravel', name: 'Gravel' },
    ironIngot: { key: 'ironIngot', name: 'Iron Ingot' },
    yelloriumIngot: { key: 'yelloriumIngot', name: 'Yellorium Ingot' },
    fuelRod: { key: 'fuelRod', name: 'Yellorium Fuel Rod' },
    sand: { key: 'sand', name: 'Sand' },
    reactorCasing: { key: 'reactorCasing', name: 'Casing' },
    reactorController: { key: 'reactorController', name: 'Controller' },
    controlRod: { key: 'controlRod', name: 'Control Rod' },
    goldIngot: { key: 'goldIngot', name: 'Gold Ingot' }
  };

  var makeRecipe = function(numYield, ingredients) {
    return {
      numYield: numYield,
      ingredients: ingredients
    };
  };

  // Crafting recipes for various materials
  var materialCosts = {
    cryotheum: makeRecipe(2, [[materials.blizzPowder, 1], [materials.niter, 1], [materials.redstone, 1], [materials.snowball, 1]]),
    blizzPowder: makeRecipe(1, [[materials.redstone, 2], [materials.snowball, 1]]),
    niter: makeRecipe(1, [[materials.sandstone, 10]]), // expected -- generated randomly
    graphiteBar: makeRecipe(1, [[materials.charcoal, 1]]), // in a furnace
    fuelRod: makeRecipe(1, [[materials.graphiteBar, 2], [materials.ironIngot, 6], [materials.yelloriumIngot, 1]]),
    sandstone: makeRecipe(1, [[materials.sand, 4]]),
    reactorCasing: makeRecipe(4, [[materials.graphiteBar, 4], [materials.ironIngot, 4], [materials.yelloriumIngot, 1]]),
    reactorController: makeRecipe(1, [[materials.diamond, 1], [materials.reactorCasing, 4], [materials.redstone, 1], [materials.yelloriumIngot, 2]]),
    controlRod: makeRecipe(1, [[materials.graphiteBar, 3], [materials.reactorCasing, 4], [materials.redstone, 1], [materials.yelloriumIngot, 1]])
  };

  // Reactor interiors -> crafting ingredients
  var reactorContentsMaterials = {
    R: [[materials.redstone, 10]],
    E: [[materials.enderPearl, 4]],
    D: [[materials.diamond, 9]],
    C: [[materials.cryotheum, 10]],
    G: [[materials.graphiteBar, 9]],
    X: materialCosts.fuelRod.ingredients,
    L: [[materials.goldIngot, 9]]
  };

  var modpacks = {
    defaults: { name: 'Defaults', key: 'defaults' },
    direwolf20: { name: 'Direwolf20', key: 'direwolf20' },
    btp: { name: 'BTP', key: 'btp' }
  };

  var makeConfig = function(fuelUsageMultiplier, powerProductionMultiplier) {
    return {
      fuelUsageMultiplier: fuelUsageMultiplier,
      powerProductionMultiplier: powerProductionMultiplier
    };
  };

  var modpackConfigs = {
        defaults: makeConfig(1.0, 1.0),
        direwolf20: makeConfig(10.0, 1.0), // dw20 10x's fuel usage
        btp: makeConfig(1.3, 0.7)
      },
      modpackConfig = modpackConfigs.defaults;

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

  // Controls whether we render ingredients tree or just leaves
  var costModes = {
        breakdown: 1, totals: 2
      },
      costMode = costModes.breakdown;

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
    maxReactorWidth = ($(window).width() - $('#reactor-controls').width() - 100);
    maxReactorHeight = ($(window).height() - $('.masthead').height() - 100);

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

    $('#reactor-title').html('Editing: ' +
    params.x + 'x' + params.z + 'x' + params.height + ' Reactor');

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
    calculateCost();
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
    var reactorParams = $('#reactor-area').data();
    response = $.extend({}, response);

    // Apply modpack modifiers
    response.output *= modpackConfig.powerProductionMultiplier;
    response.fuelConsumption *= modpackConfig.fuelUsageMultiplier;

    var output = response.output;
    var fuelUse = response.fuelConsumption;
    var fuelEff = output / fuelUse;

    response.outputPerFuel = output / fuelUse;

    // Reactor dimensions are interior. +2 to get exterior dimensions
    var volume = (reactorParams.x + 2) * (reactorParams.z + 2) * (reactorParams.height + 2);

    response.outputPerBlock = output / volume;
    response.outputPerFuelPerBlock = fuelEff / volume;

    $.each(response, function(k, v) {
      response[k] = addCommas(Math.round(v * 100) / 100);
    });

    return response;
  };

  var displaySimulationResponse = function(response) {
    $('#error-area').html('');
    response = augmentResponse(response);
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
              } else if (jqhxr.status == 429) {
                error = 'Rate limit exceeded.';
              } else {
                error = textStatus + ", " + err;
              }
              $('#error-area').html(error);
              loading.hide();
            }
        );
      }
    }
    calculateCost();
  };

  var calculateCost = function() {
    var params = $('#reactor-area').data()
        , width = params.x
        , length = params.z
        , height = params.height
        , materialCounts = {}
        , totalCosts = [];

    $('.grid-table td.contents').each(function(i, e) {
      var c = $(e).data('character');

      if (c) {
        materialCounts[c] |= 0;
        materialCounts[c] += height;
      }
    });

    // Add costs from interior
    $.each(materialCounts, function(k,v) {
      // Don't add cost for air
      if (k == 'O') {
        return;
      }

      var material = $('.grid-option')
          .filter(function() { return $(this).data('character') == k; })
          .data(),
          c = {
            material: material,
            count: v
          };

      // this is a gross hack to account for the fact that control rods are sort of treated
      // as an "interior" material.
      if (k == 'X') {
        c.material = materials.fuelRod;
        c.children = calculateMaterialCost(c);
      } else {
        c.children = calculateInteriorCost(c);
      }

      totalCosts.push(c);
    });

    // Add costs for casing, which is
    var exWidth = (width + 2)
        , exLength = (length + 2)
        , numRods = $('.grid-table .contents').filter(function () { return $(this).data('character') == 'X'; }).length
        , casingCount =
            // Top and bottom
            (exWidth * exLength * 2)
              // Front and back
            + (exWidth * height * 2)
              // Left and right. Use internal length to avoid double-counting edges w/ front and back
            + (length * height * 2)
              // Minus any control rods, which will occupy slots in the top
            - numRods
              // Minus 1 for a controller
            - 1;

    var casingCost = [
      { material: materials.reactorCasing, count: casingCount },
      { material: materials.reactorController, count: 1 }
    ];

    if (numRods > 0) {
      casingCost.push({ material: materials.controlRod, count: numRods });
    }

    $.each(casingCost, function(i, e) {
      e.children = calculateMaterialCost(e);
      totalCosts.push(e);
    });

    if (costMode == costModes.totals) {
      totalCosts = collapseCosts(totalCosts);
    } else {
      totalCosts.sort(function(a, b) {
        a = a.material.name;
        b = b.material.name;

        if (a < b) {
          return -1;
        } else if (b < a) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    var costsArea = $('#costs-area')
        , costsList = $('> ul', costsArea);

    if (costsList.length == 0) {
      costsList = $('<ul></ul>');
      costsArea.append(costsList, totalCosts);
    } else {
      renderCosts(costsList, totalCosts);
    }
  };

  var renderCosts = function(base, costs) {
    // Will add this tag for present items.
    $('> li', base).removeData('present');

    $.each(costs, function(i, e) {
      var elem = $('> li', base)
              .filter(function () {
                return $(this).data('material') == e.material.name;
              })
          , label;

      if (elem.length == 0) {
        elem = $('<li></li>')
            .addClass('costs-item')
            .data('material', e.material.name)
            .data('present', true);

        var bgUrl;
        if (e.material.character) {
          bgUrl = 'textures/' + e.material.character;
        } else {
          bgUrl = 'icons/' + e.material.key;
        }
        var icon = $('<div></div>')
                .addClass('texture')
                .css({backgroundImage: 'url(assets/' + bgUrl + '.gif)'});
        label = $('<span></span>')
            .addClass('material-label')
            .addClass('collapsed')
            .append(e.material.name)
            .append($('<span></span>').addClass('material-count').html(addCommas(e.count)));

        elem.append(icon).append(label);
        base.append(elem);
      } else {
        $('.material-count', elem).html(addCommas(e.count));
        elem.data('present', true);
      }

      if (e.children && e.children.length > 0) {
        var childrenBase = $('> ul', elem);

        if (childrenBase.length == 0) {
          childrenBase = $('<ul></ul>');
          label.addClass('parent');
          elem.append(childrenBase);
        }

        renderCosts(childrenBase, e.children);
      }
    });

    // Remove any items not tagged with "present", indicating they're no longer part of the
    // reactor design.
    $('> li', base)
        .filter(function() { return !$(this).data('present'); })
        .remove();

    return base;
  };

  // Returns an array of objects, each with:
  //   - material
  //   - count
  //   - children materials
  var calculateInteriorCost = function(cost) {
    var materialCost = [];
    $.each(reactorContentsMaterials[cost.material.character], function (i, e) {
      var c = {
        material: e[0],
        count: e[1]*cost.count
      };

      c.children = calculateMaterialCost(c);
      materialCost.push(c);
    });
    return materialCost;
  };

  var calculateMaterialCost = function(cost) {
    var materialCost = [];

    if (materialCosts[cost.material.key]) {
      var recipe = materialCosts[cost.material.key];
      $.each(recipe.ingredients, function (i, e) {
        var c = {
          material: e[0],
          count: Math.ceil((e[1] * cost.count) / recipe.numYield)
        };
        c.children = calculateMaterialCost(c);
        materialCost.push(c);
      });
    }

    return materialCost;
  };

  var collapseCosts = function(costs) {
    var collapsedCosts = {}
        , addCosts = function(e) {
          if (!collapsedCosts[e.material.key]) {
            collapsedCosts[e.material.key] = e;
          } else {
            collapsedCosts[e.material.key].count += e.count;
          }
        };

    $.each(costs, function(i, e) {
      if (e.children && e.children.length > 0) {
        $.each(collapseCosts(e.children), function(i, child) {
          addCosts(child);
        });
      } else {
        addCosts(e);
      }
    });

    var sortedKeys = Object.keys(collapsedCosts).sort()
        , flattenedCosts = [];

    $.each(sortedKeys, function(i, e) {
      flattenedCosts.push(collapsedCosts[e]);
    });

    return flattenedCosts;
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

    $.each(modpackConfigs, function(k, config) {
      var modpack = modpacks[k]
          , elem = $('<li></li>')
              .data('option', modpack.key)
              .html(modpack.name);

      if (modpack == modpacks.defaults) {
        elem.addClass('active');
      }

      $('#modpack').append(elem);
    });

    $('#modpack').on('modeChange', function(e, option) {
      modpackConfig = modpackConfigs[option];
      updateHashParams({modpack: option});
      simulate();
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
          if (dragging) {
            dragging = false;
            updateHashParams({layout: rlencode(getLayoutStr())});
            simulate();
          }
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

    $('body').on('click', '.costs-item', function() {
      if ($('> ul', this).toggle().is(':visible')) {
        $('> .material-label', this).removeClass('collapsed');
      } else {
        $('> .material-label', this).addClass('collapsed');
      }
      return false;
    });

    $('#costs-mode').on('modeChange', function(e, mode) {
      costMode = costModes[mode];
      calculateCost();
    });

    var parseReactorParams = function() {
      var params = getHashParams();
      if (params.modpack && modpackConfigs[params.modpack]) {
        modpackConfig = modpackConfigs[params.modpack];
        $('#modpack > li')
            .removeClass('active')
            .filter(function() { return $(this).data('option') == params.modpack; })
            .addClass('active');
      }

      if (getHashLocation() == 'reactor-design') {
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
