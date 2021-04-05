(function(){

    var attrArray = ["STREET","COMMERCIAL","GREEN","INDUSTRY","MULTIFAM","OTHER","PUBLIC","SINGLEFAM","VACANT","TOTAL"],
        expressed = attrArray[0],
        total = attrArray[9];

    window.onload = setMap();

    function setMap(){
        
        var w = window.innerWidth * 0.5, h = window.innerHeight - 30; 

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

            neighborhoodsObj = joinData(neighborhoodsObj, attributesData)

            var colorScale = makeColorScale(attributesData);

            setNeighborhoods(neighborhoodsObj, map, path, colorScale)

            setChart(attributesData, colorScale);
        }
    }

    function setChart(tableData, colorScale){
        tableData.sort(function(a, b){
            return (a[expressed]/a[total] * 100) - (b[expressed]/b[total] * 100);
        })
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.45,
            chartHeight = window.innerHeight - 30,
            innerRadius = 50,
            outerRadius = Math.min(chartWidth, chartHeight) / 2 - 50;

        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, 41]);
    
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart")
            .append("g")
            .attr('transform', 'translate(' + chartWidth/2 +  ',' + chartHeight/2 +')');

        var chartTitle = chart.append("text")
            .attr('transform', 'translate(' + -chartWidth/2 +  ',' + -chartHeight/2 +')')
            .attr("x", 20)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text("Street Cover as % of Total Land Cover");

        var x = d3.scaleBand()
            .range([0, 2 * Math.PI])    // X axis goes from 0 to 2pi = all around the circle. If I stop at 1Pi, it will be around a half circle
            .align(0)                  // This does nothing ?
            .domain(tableData.map(function(d) { return d.OBJECTID; }) ); // The domain of the X axis is the list of states.
      
        // Y scale
        var y = d3.scaleRadial()
            .range([innerRadius, outerRadius])   // Domain will be define later.
            .domain([0, 41]); // Domain of Y is from 0 to the max seen in the data

        //http://bl.ocks.org/nbremer/21746a9668ffdf6d8242

        var coxcomb = chart.append("g")
            .selectAll(".bars")
            .data(tableData)
            .enter()
            .append("path")
            .style("fill", function(d){
                return colorScale((d[expressed]/d[total]) * 100);
            })
            .attr("d", d3.arc()     
                    .innerRadius(innerRadius)
                    .outerRadius(function(d) { return y((d[expressed]/d[total]) * 100)})
                    .startAngle(function(d) { return x(d.OBJECTID); })
                    .endAngle(function(d) { return x(d.OBJECTID) + x.bandwidth(); })
                    .padAngle(0.01)
                    .padRadius(innerRadius)
            )
            .attr('transform', 'translate(0,40)');

        var yAxis = chart.append("g")
            .attr('transform', 'translate(0,40)')
            .attr("text-anchor", "middle");
  
        var yTick = yAxis
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
                
        /*
        var bars = chart.selectAll(".bars")
            .data(tableData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return (a[expressed]/a[total] * 100) - (b[expressed]/b[total] * 100);
            })
            .attr("class", function(d){
                return "bars " + d.OBJECTID;
            })
            .attr("width", chartWidth / tableData.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / tableData.length);
            })
            .attr("height", function(d){
                return yScale((d[expressed]/d[total]) * 100);
            })
            .attr("y", function(d){
                return chartHeight - yScale((d[expressed]/d[total]) * 100);
            })
            .style("fill", function(d){
                return colorScale((d[expressed]/d[total]) * 100);
            });;
        */
    };

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

        return obj;
    }

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

    function setNeighborhoods(neighborhoodsObj, map, path, colorScale){
        var neighborhoods = map.selectAll(".neighborhoods")
            .data(neighborhoodsObj)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "neighborhood " + d.properties.NEIGHBORHD;
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
            .attr("d", path);
    }

})();