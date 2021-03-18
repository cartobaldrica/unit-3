window.onload = function(){
    var w = window.innerWidth, h = window.innerHeight; 

    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];
    
    var container = d3.select("body")
        .append("svg")
        .attr("width",w)
        .attr("height",h)
        .attr("class","container")
        .style("background-color","rgba(0,0,0,0.2");
    
    var innerRect = container.append("rect")
        .attr("width",function(d){
            return w - 100;
        })
        .attr("height",function(d){
            return h - 100;
        })
        .attr("class","innerRect")
        .attr("x", 50)
        .attr("y", 50);

    var minPop = d3.min(cityPop,function(d){
        return d.population;
    });

    var maxPop = d3.max(cityPop,function(d){
        return d.population;
    });

    var x = d3.scaleLinear()
    .range([90,w-160]) //output min/max
    .domain([0,3]); //input min/max

    var y = d3.scaleLinear()
        .range([h-50,50])
        .domain([
            0,
            700000
        ]);

    var color = d3.scaleLinear()
        .range([
            "#fde0dd",
            "#c51b8a"
        ])
        .domain([
            minPop,
            maxPop
        ])

    var circles = container.selectAll(".circles")
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class","circles")
        .attr("r",function(d,i){
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx",function(d,i){
            return x(i);
        })
        .attr("cy",function(d){
            return y(d.population)
        })
        .style("fill",function(d){
            return color(d.population)
        })
        .style("stroke","#000");

    var yAxis = d3.axisLeft(y);

    var axis = container.append("g")
        .attr("class","axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    yAxis(axis);

    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", w/2)
        .attr("y", 30)
        .text("City Populations");

    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class","labels")
        .attr("text-anchor","left")
        .attr("y", function(d){
            return y(d.population);
        });

    var nameLine = labels.append("tspan")
        .attr("class","nameLine")
        .attr("x",function(d,i){
            return x(i) + Math.sqrt((d.population * 0.01) / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        })
        .style("font-weight","bold");

    var popLine = labels.append("tspan")
        .attr("class","nameLine")
        .attr("x",function(d,i){
            return x(i) + Math.sqrt((d.population * 0.01) / Math.PI) + 5;
        })
        //dy is relative coordinate
        .attr("dy", "15")
        .text(function(d){
            return "Pop. " + d3.format(",")(d.population);
        });
}