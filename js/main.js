window.onload = setMap();

function setMap(){
    
    var w = window.innerWidth, h = window.innerHeight; 

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

        var neighborhoodsObj = topojson.feature(neighborhoodData, neighborhoodData.objects.mkeNeighborhoods),
            countiesObj = topojson.feature(countiesData, countiesData.objects.wiCounties);
        //wisconsin counties
        var counties = map.append("path")
            .datum(countiesObj)
            .attr("class", "counties")
            .attr("d", path);
        //milwaukee neighborhoods
        var neighborhoods = map.selectAll(".neighborhoods")
            .data(neighborhoodsObj.features)
            .enter()
            .append("path")
            .attr("class", function(d){
                console.log(d)
                return "neighborhood " + d.properties.NEIGHBORHD;
            })
            .attr("d", path);
    }
}

