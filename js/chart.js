(function(){
    //attribute variables
    var attrArray = ["STREET","COMMERCIAL","GREEN","INDUSTRY","MULTIFAM","OTHER","PUBLIC","SINGLEFAM","VACANT","TOTAL"],
        expressed = attrArray[0],
        total = "TOTAL";

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.45,
        chartHeight = window.innerHeight - 30,
        innerRadius = 50,
        outerRadius = Math.min(chartWidth, chartHeight) / 2 - 50;

    //Chart scales - domains will be defined when chart is created
    var x = d3.scaleBand()
        .range([0, 2 * Math.PI])  
        .align(0)   

    var y = d3.scaleRadial()
        .range([innerRadius, outerRadius]);  

    //initialize map
    window.onload = setMap();

    function setMap(){
        //find width/height of window
        var w = window.innerWidth * 0.5, h = window.innerHeight - 30; 

        //create map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", w)
            .attr("height", h);
        //transverse cylindrical equal area projection, centered on Milwaukee
        var projection = d3.geoEquirectangular()
            .center([44.5, 0])
            .rotate([87.95, -87.55, 90])
            .angle(-90)
            .scale(140000.00)
            .translate([w / 2, h / 2]);

        var path = d3.geoPath()
            .projection(projection);
        
        var promises = [d3.csv("data/MKE_neighborhoods_attributes.csv"),
                        d3.json("data/mkeNeighborhoods.topojson"),
                        d3.json("data/WI_counties.topojson")];

        Promise.all(promises).then(callback)

        function callback(data){
            var attributesData = data[0],
                neighborhoodData = data[1],
                countiesData = data[2];

            var neighborhoodsObj = topojson.feature(neighborhoodData, neighborhoodData.objects.mkeNeighborhoods).features,
                countiesObj = topojson.feature(countiesData, countiesData.objects.wiCounties);
            //wisconsin counties
            var counties = map.append("path")
                .datum(countiesObj)
                .attr("class", "counties")
                .attr("d", path);

            var colorScale = makeColorScale(attributesData);

            neighborhoodsObj = joinData(neighborhoodsObj, attributesData)

            setNeighborhoods(neighborhoodsObj, map, path, colorScale)

            setChart(attributesData, colorScale);

            createDropdown(attributesData);
        }
    }

    function setNeighborhoods(neighborhoodsObj, map, path, colorScale){
        var neighborhoods = map.selectAll(".neighborhoods")
            .data(neighborhoodsObj)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "neighborhood n" + d.properties.OBJECTID;
            })
            .style("fill", function(d){
                if (d.properties[expressed]){
                    var val = (d.properties[expressed]/d.properties[total]) * 100;
                    return colorScale(val);
                }
                else{
                    return '#ccc';
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

    function setChart(tableData, colorScale){
        //create a second svg element to hold the chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart")
            .append("g")
            .attr('transform', 'translate(' + chartWidth/2 +  ',' + chartHeight/2 +')');
        //add chart title
        var chartTitle = chart.append("text")
            .attr('transform', 'translate(' + -chartWidth/2 +  ',' + -chartHeight/2 +')')
            .attr("x", 20)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text("Street Cover as % of Total Land Cover");
        
        //set x and y domain
        x.domain(tableData.map(function(d) { return d.OBJECTID; }) ); // The domain of the X axis is the list of states.
        y.domain([0, maxData(tableData)]); 
        //http://bl.ocks.org/nbremer/21746a9668ffdf6d8242
        //index for sorting coxcomb blocks
        var index = 0;
        //create coxcomb chart
        var coxcomb = chart.append("g")
            .selectAll(".bars")
            .data(tableData)
            .enter()
            .append("path")
            .sort(function(a, b){
                return (a[expressed]/a[total] * 100) - (b[expressed]/b[total] * 100);
            })
            .attr("class", function(d){
                return "bars n" + d.OBJECTID;
            })
            .style("fill", function(d){
                d.index = index;
                index++;
                return colorScale((d[expressed]/d[total]) * 100);
            })
            .attr("d", d3.arc()     
                .innerRadius(innerRadius)
                .outerRadius(function(d) {return y((d[expressed]/d[total]) * 100)})
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
        //create coxcomb legend
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
    //when a new feature is selected
    function changeAttribute(attribute, csvData){
        expressed = attribute;

        var colorScale = makeColorScale(csvData);

        var regions = d3.selectAll(".neighborhood")
            .transition()
            .duration(1000)
            .style("fill", function(d){
            var value = d.properties[expressed];
            if (value){
                var val = (d.properties[expressed]/d.properties[total]) * 100;
                return colorScale(val);
            }
            else {
                return '#ccc';
            }
        })

        x.domain(csvData.map(function(d) { return d.OBJECTID; }) ); // The domain of the X axis is the list of states.
        y.domain([0, maxData(csvData)]); 

        var index = 0;

        var coxcomb = d3.selectAll(".bars")
            .sort(function(a, b){
                return (a[expressed]/a[total] * 100) - (b[expressed]/b[total] * 100);
            })
            .transition() //add animation
            .duration(1000)
            .style("fill", function(d){
                d.index = index;
                index++;
                var value = d[expressed];
                if (value){
                    var val = (d[expressed]/d[total]) * 100;
                    return colorScale(val);
                }
                else {
                    return '#ccc';
                }
            })
            .attr("d", d3.arc()     
                    .innerRadius(innerRadius)
                    .outerRadius(function(d) { return y((d[expressed]/d[total]) * 100)})
                    .startAngle(function(d) { return x(d.index); })
                    .endAngle(function(d) { return x(d.index) + x.bandwidth(); })
                    .padAngle(0.01)
                    .padRadius(innerRadius)
            );

  
       // d3.selectAll(".tickContainer").remove();

        d3.select(".tickContainer").selectAll("*").remove();
  
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

    //highlight element
    function highlight(props){
        //change stroke
        var selected = d3.selectAll(".n" + props.OBJECTID)
            .style("stroke", "black")
            .style("stroke-width", "2.5");

        setLabel(props);
    };
    //dehighlight element
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
    
    //join data to topojson
    function joinData(obj, attr){
        for (var i = 0; i < attr.length; i++){
                
            var attributeCurrent = attr[i],
                attributeKey = attributeCurrent.OBJECTID;
            
            for (var j = 0; j < obj.length; j++){
                
                var neighborhoodProps = obj[j].properties;
                var neighborhoodKey = neighborhoodProps.OBJECTID;

                if (attributeKey == neighborhoodKey){

                    attrArray.forEach(function(attr){
                        var val = parseFloat(attributeCurrent[attr]);
                        neighborhoodProps[attr] = val;
                    })

                }
            }
        }
        attrArray.pop();
        return obj;
    }
    //create the color scale
    function makeColorScale(data){
        var colorClasses = [
            "#ffffb2",
            "#fecc5c",
            "#fd8d3c",
            "#f03b20",
            "#bd0026"
        ];

        var colorScale = d3.scaleQuantile()
            .range(colorClasses)

        var domainArray = [];
        for (var i = 0; i < data.length; i++){
            var val = (parseFloat(data[i][expressed])/parseFloat(data[i][total]))*100;
            domainArray.push(val)
        };

        colorScale.domain(domainArray);

        return colorScale;
    }

    function createDropdown(csv){
        var dropdown = d3.select("body")
            .append("select")
            .attr("class","dropdown")
            .on("change", function(){
                changeAttribute(this.value, csv)
            });

        var titleOption = dropdown.append("option")
            .attr("class","titleOption")
            .attr("disabled","true")
            .text("Select Attribute");

        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){
                return d;
            })
            .text(function(d){
                return d;
            });
    }

    function setLabel(props){
        var displayValue = ((props[expressed]/props[total]) * 100).toFixed(2);;
        var labelAttribute = "<h1>" + displayValue + "% " + expressed + "<h1>";

        var infoLabel = d3.select("body")
            .append("div")
            .attr("class","infolabel")
            .attr("id", props.OBJECTID + "_label")
            .html(labelAttribute);

        var nbdName = infoLabel.append("div")
            .attr("class","labelname")
            .html(props.NEIGHBORHD);
    }

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

    //find data maximum (used to determine the maximum value in scale domains)
    function maxData(data){
        var arr = [];
        for (var i = 0; i < data.length; i++){
            var val = data[i][expressed]/data[i][total] * 100;
            arr.push(val)
        }
        return d3.max(arr);
    }

})();