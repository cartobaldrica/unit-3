(function(){
    //attribute variables
    var total = "TOTAL",
        legendLabels = [],
        //variable to store attribute name, label, colors, and description for each variable in the re-expression
        items = [{
            attr:"STREET",
            label:"Streets",
            colorClasses: ['#f7f7f7','#cccccc','#969696','#636363','#252525'],
            desc: "Includes surfaces paved for cars, such as streets, highways, and some parking lots."
        },
        {
            attr:"COMMERCIAL",
            label:"Commercial",
            colorClasses: ['#eff3ff','#bdd7e7','#6baed6','#3182bd','#08519c'],
            desc: "Includes all commercial retailers, service providers, and offices."
        },
        {
            attr:"GREEN",
            label:"Green Space",
            colorClasses: ['#ffffcc','#c2e699','#78c679','#31a354','#006837'],
            desc: "Includes green space and wildland, does not include include school grounds."
        },
        {
            attr:"INDUSTRY",
            label:"Industrial",
            colorClasses: ['#fbff90','#dce053','#bcbf1e','#9a9c19','#7a7c14'],
            desc: "Includes all industrial and manufacturing buildings, including warehouses."
        },
        {
            attr:"MULTIFAM",
            label:"Multi-Family",
            colorClasses: ['#feebe2','#fbb4b9','#f768a1','#c51b8a','#7a0177'],
            desc: "Includes all multi-family housing, including duplexes."
        },
        {
            attr:"OTHER",
            label:"Other",
            colorClasses:['#ffffff','#dacec1','#b4a086','#8e744f','#674b1a'],
            desc: "A catch-all category that includes all land uses not covered by other categories. Primarily Includes communication and transportation services, such as airports and telecommunications."
        },
        {
            attr:"PUBLIC",
            label:"Public",
            colorClasses: ['#fee5d9','#fcae91','#fb6a4a','#de2d26','#a50f15'],
            desc: "Includes all schools, places of worship, and most city/state owned land. Does not include parks."
        },
        {
            attr:"SINGLEFAM",
            label:"Single Family",
            colorClasses: ['#f2f0f7','#cbc9e2','#9e9ac8','#756bb1','#54278f'],
            desc: "Includes all single family homes."
        },
        {
            attr:"VACANT",
            label:"Vacant Land",
            colorClasses: ['#ffffd4','#fed98e','#fe9929','#d95f0e','#993404'],
            desc: "Includes all land vacant or under construction."
        },
        {
            attr:"TOTAL"
        }],
        expressed = items[0];


    /*DIMENSIONS*/
    //page 
    var h = window.innerHeight, 
        w = window.innerWidth;
    //map
    var mapWidth = w * ((2/6)), 
        mapHeight = h - 30; 
    //chart
    var chartWidth = w/2 - 40,
        chartHeight = h - 30,
        innerRadius = 50,
        outerRadius = Math.min(chartWidth, chartHeight) / 2 - 50;    
    
    /*Scales*/
    //Chart scales - domains will be defined when chart is created. Pseudo-global to aid re-expression
    var x = d3.scaleBand()
        .range([0, 2 * Math.PI])  
        .align(0)   

    var y = d3.scaleRadial()
        .range([innerRadius, outerRadius]); 

    /*Initialize Map*/
    window.onload = setMap();

    function setMap(){
        //create map
        var map = d3.select("#viz")
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight)
            .style("padding-left", function(){
                return window.innerWidth/6 + 20 + "px";
            });   
        //add affordance title
            var title = map
                .append("text")
                .attr("class","title")
                .attr("x",10)
                .attr("y",25)
                .text("Hover over chart/neighborhoods");     
        //transverse cylindrical equal area projection, centered on Milwaukee
        var projection = d3.geoEquirectangular()
            .center([44.5, 0])
            .rotate([87.95, -87.55, 90])
            .angle(-90)
            .scale(140000.00)
            .translate([mapWidth / 2, mapHeight / 2]);

        var path = d3.geoPath()
            .projection(projection);
        //add data
        var promises = [d3.csv("data/MKE_neighborhoods_attributes.csv"),
                        d3.json("data/mkeNeighborhoods.topojson")];

        Promise.all(promises).then(callback)
            //data callback
        function callback(data){
            var attributesData = data[0],
                neighborhoodData = data[1];

            var neighborhoodsObj = topojson.feature(neighborhoodData, neighborhoodData.objects.mkeNeighborhoods).features;
            //create colorscale
            var colorScale = makeColorScale(attributesData, expressed.colorClasses);
            //get legend labels from colorscale range
            colorScale.range().forEach(function(d){
                legendLabels.push(colorScale.invertExtent(d))
            })
            //join attribute and spatial data
            neighborhoodsObj = joinData(neighborhoodsObj, attributesData)
            //create milwaukee map
            setNeighborhoods(neighborhoodsObj, map, path, colorScale)
            //create radial bar diagram
            setChart(attributesData, colorScale);
            //create legend sidebar
            createSidebar(attributesData);
        }
    }
    /*CREATE MILWAUKEE NEIGHBORHOODS MAP*/
    function setNeighborhoods(neighborhoodsObj, map, path, colorScale){
        var neighborhoods = map.selectAll(".neighborhoods")
            .data(neighborhoodsObj)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "neighborhood n" + d.properties.OBJECTID;
            })
            //style each neighborhood, no data is colored at black
            .style("fill", function(d){
                if (d.properties[expressed.attr]){
                    var val = (d.properties[expressed.attr]/d.properties[total]) * 100;
                    return colorScale(val);
                }
                else{
                    return 'rgba(0,0,0,0)';
                }
            })
            .attr("d", path)
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        neighborhoods.append("desc")
            .text('{"stroke-width":"1.5px", "stroke":"white"}')
    }
    /*CREATE RADIAL BAR CHART*/
    function setChart(tableData, colorScale){
        //create a svg element to hold the chart
        var chart = d3.select("#viz")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart")
            .append("g")
            .attr('transform', 'translate(' + chartWidth/2 +  ',' + chartHeight/2 +')');
        
        //set x and y domain
        x.domain(tableData.map(function(d) { 
                return d.OBJECTID; 
            }) 
        );
        y.domain([0, maxData(tableData)]); 
        //index for sorting data, sort function won't work on its own with the radial bar chart
        var index = 0;
        //create coxcomb chart
        var coxcomb = chart.append("g")
            .selectAll(".bars")
            .data(tableData)
            .enter()
            .append("path")
            .sort(function(a, b){
                return (a[expressed.attr]/a[total] * 100) - (b[expressed.attr]/b[total] * 100);
            })
            .attr("class", function(d){
                return "bars n" + d.OBJECTID;
            })
            .style("fill", function(d){
                d.index = index;
                index++;
                return colorScale((d[expressed.attr]/d[total]) * 100);
            })
            .attr("d", d3.arc()     
                .innerRadius(innerRadius)
                .outerRadius(function(d) {return y((d[expressed.attr]/d[total]) * 100)})
                .startAngle(function(d) { return x(d.index); })
                .endAngle(function(d) { return x(d.index) + x.bandwidth(); })
                .padAngle(0.01)
                .padRadius(innerRadius)
            )
            .attr('transform', 'translate(0,40)')
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        coxcomb.append("desc")
            .text('{"stroke-width":"0.5px", "stroke":"white"}')
        //create radial bar legend
        var yAxis = chart.append("g")
            .attr("class", "yaxis")
            .attr('transform', 'translate(0,40)')
            .attr("text-anchor", "middle");
  
        var yTick = yAxis
            .attr("class", "tickContainer")
            .selectAll("g")
            .data(y.ticks(4).slice(1))
            .enter().append("g");
  
        yTick.append("circle")
            .attr("class", "tick")
            .attr("r", y);
  
        yTick.append("text")
            .attr("y", function(d) { return -y(d); })
            .attr("class", "axisHalo")
            .attr("dy", "0.35em")
            .text(y.tickFormat(5, "s"));
    
        yTick.append("text")
            .attr("y", function(d) { return -y(d); })
            .attr("class", "axisLabel")
            .attr("dy", "0.35em")
            .text(y.tickFormat(5, "s"));

    };
    /*ATTRIBUTE SELECTION*/
    function changeAttribute(attribute, csvData){

        expressed = attribute;
        legendLabels = [];
        //update color scale and legend labels
        var colorScale = makeColorScale(csvData, expressed.colorClasses);
            colorScale.range().forEach(function(d){
                legendLabels.push(colorScale.invertExtent(d))
            })
        //update neighborhood coloration
        var neighborhoods = d3.selectAll(".neighborhood")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed.attr];
                if (value){
                    var val = (d.properties[expressed.attr]/d.properties[total]) * 100;
                    return colorScale(val);
                }
                else {
                    return '#000';
                }
            });
        //update chart domains
        x.domain(csvData.map(function(d) { return d.OBJECTID; }) ); 
        y.domain([0, maxData(csvData)]); 
        //new chart index for sorting
        var index = 0;
        //update chart
        var chart = d3.selectAll(".bars")
            .sort(function(a, b){
                return (a[expressed.attr]/a[total] * 100) - (b[expressed.attr]/b[total] * 100);
            })
            .transition() //add animation
            .duration(1000)
            .style("fill", function(d){
                d.index = index;
                index++;
                var value = d[expressed.attr];
                if (value){
                    var val = (d[expressed.attr]/d[total]) * 100;
                    return colorScale(val);
                }
                else {
                    return '#ccc';
                }
            })
            .attr("d", d3.arc()     
                    .innerRadius(innerRadius)
                    .outerRadius(function(d) { return y((d[expressed.attr]/d[total]) * 100)})
                    .startAngle(function(d) { return x(d.index); })
                    .endAngle(function(d) { return x(d.index) + x.bandwidth(); })
                    .padAngle(0.01)
                    .padRadius(innerRadius)
            );

        //remove old chart legend
        d3.select(".tickContainer").selectAll("*").remove();
        //add new chart legend
        var yTick = d3.selectAll(".tickContainer")
            .selectAll("g")
            .data(y.ticks(4).slice(1))
            .enter().append("g");
          
        yTick.append("circle")
            .attr("class", "tick")
            .attr("r", y);
  
        yTick.append("text")
            .attr("y", function(d) { return -y(d); })
            .attr("class", "axisHalo")
            .attr("dy", "0.35em")
            .text(y.tickFormat(5, "s"));
    
        yTick.append("text")
            .attr("y", function(d) { return -y(d); })
            .attr("class", "axisLabel")
            .attr("dy", "0.35em")
            .text(y.tickFormat(5, "s"));
    }

    /*HIGHLIGHT ELEMENT*/
    function highlight(props){
        //change stroke
        var selected = d3.selectAll(".n" + props.OBJECTID)
            .style("stroke", "black")
            .style("stroke-width", "2.5");
        setLabel(props);
    };
    /*DEHIGHLIGHT ELEMENT*/
    function dehighlight(props){
        var selected = d3.selectAll(".n" + props.OBJECTID)
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            })
            .style("stroke", function(){
                return getStyle(this, "stroke")
            });
    
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
    
            var styleObject = JSON.parse(styleText);
    
            return styleObject[styleName];
        };

        d3.select(".infolabel")
            .remove();
    };
    /*JOIN SPATIAL AND ATTRIBUTE DATA*/
    function joinData(obj, attr){
        for (var i = 0; i < attr.length; i++){
                
            var attributeCurrent = attr[i],
                attributeKey = attributeCurrent.OBJECTID;
            
            for (var j = 0; j < obj.length; j++){
                
                var neighborhoodProps = obj[j].properties;
                var neighborhoodKey = neighborhoodProps.OBJECTID;

                if (attributeKey == neighborhoodKey){

                    items.forEach(function(attr){
                        var val = parseFloat(attributeCurrent[attr.attr]);
                        neighborhoodProps[attr.attr] = val;
                    })

                }
            }
        }
        items.pop();
        return obj;
    }
    /*CREATE COLOR SCALE*/
    function makeColorScale(data, classes){
        var colorScale = d3.scaleQuantile()
            .range(classes)

        var domainArray = [];
        for (var i = 0; i < data.length; i++){
            var val = (parseFloat(data[i][expressed.attr])/parseFloat(data[i][total]))*100;
            //0 values don't count
            if (val > 0){
                domainArray.push(val)
            }
        };

        colorScale.domain(domainArray);
        return colorScale;
    }
    /*CREATE REEXPRESSION SIDEBAR*/
    function createSidebar(csv){                                
        var sidebar = d3.select("#viz")
            .append("div")
            .attr("class","sidebar");
        //add sidebar items for each variable and space them correctly
        var attrOptions = sidebar.selectAll("attrOptions")
            .data(items)
            .enter()
            .append("div")
            .attr("class",function(d){
                return "sideoption sidebar-" + d.attr;
            })
            .text(function(d){
                return d.label;
            })
            .attr("id", function(d){
                return d.attr;
            })
            .style("width",function(d){
                return w * (1/6) + "px";
            })
            .on("click",function(i,d){
                changeAttribute(d, csv)
                selected(d, h)
            });
        
        selected(expressed, h);
        //reexpression function
        function selected(selection ,h){
            var selectionClass = ".sidebar-" + selection.attr;
            var optionHeight = 0;
            //remove existing description and label
            d3.selectAll(".selectionDesc")
            .remove();     
            d3.selectAll(".legendLabel")
            .remove();     
            //add legend label
            d3.selectAll(selectionClass)
                .append("p")
                .attr("class","legendLabel")
                .html(selection.label + " as % of Land Cover");
            //resize non-selected options          
            d3.selectAll(".sideoption")
                .transition()
                .duration(1000)    
                .style("background-color",function(d){
                    return d.colorClasses[2];
                })
                .style("height",function(){
                    optionHeight += ((h/2)/(items.length - 1)) - 20;
                    return ((h/2)/(items.length - 1)) - 20 + "px";
                });
            //enlarge selection and recolor background
            d3.selectAll(selectionClass)
                .transition()
                .duration(1000)    
                .style("background-color",function(d){
                        makeLegend(selectionClass, d.colorClasses)
                        return d.colorClasses[4];
                })
                .style("height",function(){
                    return h/2 - 20 + "px";
                });
            //add description
            d3.selectAll(selectionClass)
                .append("p")
                .attr("class","selectionDesc")
                .style("height",function(){
                    return h/2 - 20 - 200 + "px";
                })
                .html(expressed.desc);
        }
        //legend creation
        function makeLegend(selectionClass, color){
            var legendData = [];
            //create object to hold each legend item's data
            color.forEach(function(d, i){
                var temp = {
                    color: d,
                    label: legendLabels[i],
                    index: i
                }
                legendData.push(temp);
            })

            d3.selectAll(".legend-container")
                .remove();     
            
            var block = d3.select(selectionClass)
                .append("div")
                .attr("class","legend-container");
            //add legend blocks
            block.selectAll("legend-items")
                .data(legendData)
                .enter()
                .append("div")
                .attr("class",function(d){
                    return "legend legend-item-" + d.color
                })
                .html(function(d){
                    if (d.index < 4)
                        return d.label[0].toFixed(1) + "%";
                    else 
                        return d.label[0].toFixed(1) + "% <br/><br/>" + d.label[1].toFixed(1) + "%";
                })
                .style("height","30px")
                .style("width","100%")
                .style("background-image",function(d){
                    return "linear-gradient(to right, " + d.color + " 50%, " + color[4] + " 50%)";
                });

        }
    }
    /*CREATE LABEL AND LABEL CHART*/
    function setLabel(props){
        //attribute displayed on the retrieve
        var displayValue = (props[expressed.attr]/props[total] * 100).toFixed(2);
        //create retrieve tooltip
        var info = d3.select("#viz")
            .append("div")
            .attr("class","infolabel")
            .attr("id", props.OBJECTID + "_label")
            .html("<h1>" + props.NEIGHBORHD + "</h1><h2>" + displayValue + "% " + expressed.label + "</h2>");
        //create retrieve chart
        var infoChart = info.append("svg")
            .attr("class","infoChart")
            .attr("width",size)
            .attr("height",size);
        //set chart size
        var size = 250;
        //create chart scale
        var infoY = d3.scaleLinear()
            .range([0, size])
            .domain([0,100]);
        //create chart
        var infoItems = infoChart.selectAll(".infoItems")
            .data(items)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return (props[b.attr] - props[a.attr]);
            })
            .attr("class","infoRect")
            .attr("x", function(d, i){
                return i * (size / items.length);
            })
            .attr("y", function(d, i){
                return 0;
            })
            .attr("width", function(d){
                if (d.attr == expressed.attr){
                    return size / items.length - 2;
                }
                else
                    return size / items.length;
                
            })
            .attr("height", function(d, i){
                return infoY(props[d.attr]/props[total] * 100);
            })            
            .attr("fill", function(d){
                if (d.attr == expressed.attr){
                    return d.colorClasses[4];;
                }
                else
                    return d.colorClasses[2];
            })
            .style("stroke",function(d){
                if (d.attr == expressed.attr){
                    return "white";
                }
                else
                    return "none";
            })
            .style("stroke-width",function(d){
                if (d.attr == expressed.attr){
                    return "4.5px";
                }
                else
                    return "none";
            });
    }
    /*MOVE INFO LABEL*/
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 

    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    /*FIND DATA MAXIMUM FOR CHART DOMAIN*/
    function maxData(data){
        var arr = [];
        for (var i = 0; i < data.length; i++){
            var val = data[i][expressed.attr]/data[i][total] * 100;
            arr.push(val)
        }
        return d3.max(arr);
    }

})();