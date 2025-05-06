let globalData;
let currentYear = 0; // 0 means show all years
let yearRange = [1896, 2016];
let currentStat = 'height';
let currentSport = ''; // Track the selected sport
let isDragging = false; // disable certain animations when dragging slider

// Global colors object
const colors = {
    foreground: "#111",
    primary: "#daa520",
    secondary: "#f0dea3",
    lightgray: "#f0f0f0",
    background: "#f4f4f4"
};

// global chart variables
let statsChart = {};
let womenParticipationChart = {};
let medalsByYearChart = {};
let sportRecordsChart = {};

d3.csv("/olympics_cleaned.csv").then(data => {
    // Parse numerical values
    data.forEach(d => {
        d.age = +d.age;
        d.height = +d.height;
        d.weight = +d.weight;
        d.year = +d.year;
    });

    globalData = data;

    initializeEventListeners();
    initializeVisualizations();


    // Initialize visualizations
    // TODO: Add visualization code here
});

function initializeEventListeners() {
    // Initialize event listeners
    const statSelect = document.getElementById('stat-select');
    const yearSlider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');
    const sportSelect = document.getElementById('sport-select');

    yearSlider.addEventListener('mousedown', () => isDragging = true);
    yearSlider.addEventListener('touchstart', () => isDragging = true);
    yearSlider.addEventListener('mouseup', () => {
        isDragging = false;
        updateVisualizations();
    });
    yearSlider.addEventListener('touchend', () => {
        isDragging = false;
        updateVisualizations();
    });

    // Update year display when slider changes
    yearSlider.addEventListener('input', (e) => {
        // find closest year to e.target.value in globalData
        const closestYear = globalData.reduce((prev, curr) => {
            return Math.abs(curr.year - e.target.value) < Math.abs(prev.year - e.target.value) ? curr : prev;
        });

        yearDisplay.textContent = closestYear.year;
        currentYear = +closestYear.year;
        e.target.value = closestYear.year;
        updateVisualizations();
    });

    // update stat when select changes
    statSelect.addEventListener('change', (e) => {
        currentStat = e.target.value;
        updateVisualizations();
    });

    // Add sport selection event listener
    if (sportSelect) {
        sportSelect.addEventListener('change', (e) => {
            currentSport = e.target.value;
            updateSportRecords();
        });
    }
}

function initializeVisualizations() {
    initializeStatsByYear();
    initializeWomenParticipation();

    initializeMedalsByYear();
    initializeSportRecords();

    updateVisualizations();
}

function updateVisualizations() {
    updateStatsByYear();
    updateWomenParticipation();
    updateMedalsByYear();
    updateSportRecords();
}

function initializeStatsByYear() {
    // Create SVG container for stats by year
    const container = d3.select("#stats-by-year")
    const width = container.node().getBoundingClientRect().width;
    const height = 400;
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const margin = { top: 20, right: 20, bottom: 70, left: 70 };

    const chartGroup = svg.append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add an invisible background rect to capture clicks
    chartGroup.append("rect")
        .attr("class", "chart-background")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "transparent")
        .on("click", function() {
            // Reset to show all years
            currentYear = 0;
            // Update year display if it exists
            const yearDisplay = document.getElementById('year-display');
            if (yearDisplay) yearDisplay.textContent = "None Selected";
            // Update slider if it exists
            const yearSlider = document.getElementById('year-slider');
            if (yearSlider && yearSlider.min) yearSlider.value = yearSlider.min;
            
            updateVisualizations();
        });

    // Add padding to x scale domain (4 years on each side)
    const paddedYearRange = [1896 - 4, 2016 + 4];
    
    // x and y scales
    const x = d3.scaleLinear()
        .domain(paddedYearRange)  // Use padded range here
        .range([0, width - margin.left - margin.right]);

    const y = d3.scaleLinear()
        .range([height - margin.top - margin.bottom, 0]);

    // Create axes
    const xAxis = chartGroup.append("g")
        .attr("class", "x-axis")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)

    const yAxis = chartGroup.append("g")
        .attr("class", "y-axis")
        .attr("class", "axis");

    // Create a group for data points
    chartGroup.append("g")
        .attr("class", "data-points");

    if (chartGroup.select(".x-label").empty()) {
        chartGroup.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("x", (width - margin.left - margin.right) / 2)
            .attr("y", height - margin.top - margin.bottom + 50)
            .text("Olympic Year");
    }

    // store scales and other elements for later
    statsChart = {
        svg: svg,
        x: x,
        y: y,
        xAxis: xAxis,
        yAxis: yAxis,
        chartGroup: chartGroup,
        width: width,
        height: height,
        margin: margin
    }
}

function updateStatsByYear() {
    // Update stats by year visualization
    const { svg, x, y, xAxis, yAxis, chartGroup, width, height, margin } = statsChart;
    // update scale max if current stat is set
    const maxValue = d3.max(globalData, d => d[currentStat]);

    // generate custom ticks for x axis
    let ticks = [];
    // Use the padded range to generate ticks - get this from the scale's domain
    const paddedDomain = x.domain();
    for (let year = Math.floor(paddedDomain[0]/4)*4; year <= paddedDomain[1]; year += 4) {
        ticks.push(year);
    }

    // Update axes
    xAxis.call(d3.axisBottom(x)
        .tickFormat(d => d % 2 === 0 ? d : '')
        .tickValues(ticks)); // Show only even years (olympic winter/summer)

    y.domain([0, maxValue]);
    yAxis.call(d3.axisLeft(y));
    
    
    // Create data for avg stats by year
    const statsByYear = Array.from(d3.group(globalData, d => d.year), ([year, values]) => {
        return {
            year: year,
            avg: d3.mean(values, d => d[currentStat]),
            max: d3.max(values, d => d[currentStat]),
            min: d3.min(values, d => d[currentStat]),
            isActive: year === currentYear || (currentYear === 0 && year >= yearRange[0] && year <= yearRange[1]) // Mark if this is the active year
        };
    }).filter(d => !isNaN(d.avg)); 

    const tooltip = d3.select("#tooltip");
    
    // create or update year groups (these are our vertical lines)
    const yearGroups = chartGroup.selectAll(".year-group")
        .data(statsByYear);
    
    const enterGroups = yearGroups.enter()
        .append("g")
        .attr("class", "year-group");
    
    // Apply event listeners to the groups
    const allGroups = enterGroups.merge(yearGroups)
        .on("mouseenter", function(event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.year}</strong><br>
                    Max: ${d.max.toFixed(1)}<br>
                    Avg: ${d.avg.toFixed(1)}<br>
                    Min: ${d.min.toFixed(1)}`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseleave", function() {
            tooltip.style("visibility", "hidden");
        })
        .on("click", function(event, d) {
            const yearSlider = document.getElementById('year-slider');
            const yearDisplay = document.getElementById('year-display');
            // if already active, reset to show all years
            if (d.year === currentYear) {
                currentYear = 0;
                yearSlider.value = yearSlider.min;
                yearDisplay.textContent = "None Selected";
            } else {
                // set current year to the clicked year
                currentYear = d.year;
                yearSlider.value = d.year;
                yearDisplay.textContent = d.year;
            }
            updateVisualizations();
        });
    
    yearGroups.exit().remove();
    
    // First add an invisible thick line for better hover detection
    allGroups.selectAll(".hover-area")
        .data(d => [d])
        .join("line")
        .attr("class", "hover-area")
        .attr("stroke", "transparent")  // Make it invisible
        .attr("stroke-width", 24)       // Wider than visible line for easier hovering
        .attr("x1", d => x(d.year))
        .attr("x2", d => x(d.year))
        .attr("y1", d => y(d.min) - 5)  // Extend slightly beyond dots
        .attr("y2", d => y(d.max) + 5); // Extend slightly beyond dots

    const animDuration = isDragging ? 50 : 400;
    
    allGroups.selectAll(".stat-line")
        .data(d => [d])
        .join("line")
        .attr("class", "stat-line")
        .attr("stroke", colors.lightgray)
        .attr("stroke-width", 11)
        .transition()
        .duration(animDuration)
        .attr("x1", d => x(d.year))
        .attr("x2", d => x(d.year))
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("opacity", d => d.isActive ? 1.0 : 0.3); // Adjust opacity based on active state
    
    allGroups.selectAll(".min-dot")
        .data(d => [d])
        .join("circle")
        .attr("class", "min-dot")
        .attr("r", 7)
        .attr("fill", colors.secondary)
        .transition()
        .duration(animDuration)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.min))
        .attr("opacity", d => d.isActive ? 1.0 : 0.3); // Adjust opacity based on active state
    
    allGroups.selectAll(".avg-dot")
        .data(d => [d])
        .join("circle")
        .attr("class", "avg-dot")
        .attr("r", 3)
        .attr("fill", colors.foreground)
        .transition()
        .duration(animDuration)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.avg))
        .attr("opacity", d => d.isActive ? 1.0 : 0.3); // Adjust opacity based on active state

    allGroups.selectAll(".max-dot")
        .data(d => [d])
        .join("circle")
        .attr("class", "max-dot")
        .attr("r", 7)
        .attr("fill", colors.primary)
        .transition()
        .duration(animDuration)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.max))
        .attr("opacity", d => d.isActive ? 1.0 : 0.3); // Adjust opacity based on active state

    // Add axis labels    
    // Update y-axis label
    const yLabel = chartGroup.select(".y-label");
    if (yLabel.empty()) {
        chartGroup.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -(height - margin.top - margin.bottom) / 2);
    }

    // Update y-axis label text based on currentStat
    chartGroup.select(".y-label")
        .text(() => {
            switch (currentStat) {
                case 'height': return 'Average Height (cm)';
                case 'weight': return 'Average Weight (kg)';
                case 'age': return 'Average Age (years)';
                default: return '';
            }
        });

    console.log(`Updated stats by year chart with stat: ${currentStat}`);
}

function initializeWomenParticipation() {
    // Create SVG
}

function updateWomenParticipation() {
}

function initializeMedalsByYear() {
    const container = d3.select("#medals-by-year");
    const width = container.node().getBoundingClientRect().width;
    const height = 400;
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const margin = { top: 20, right: 20, bottom: 70, left: 120 };

    const chartGroup = svg.append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // x axis - amount of cumulative medals
    const x = d3.scaleLinear()
        .range([0, width - margin.left - margin.right]);
    
    // y axis - country
    const y = d3.scaleBand()
        .range([0, height - margin.top - margin.bottom])
        .padding(0.2); 

    const xAxis = chartGroup.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);

    const yAxis = chartGroup.append("g")
        .attr("class", "y-axis axis");

    chartGroup.append("g")
        .attr("class", "data-points");

    medalsByYearChart = {
        svg: svg,
        x: x,
        y: y,
        xAxis: xAxis,
        yAxis: yAxis,
        chartGroup: chartGroup,
        width: width,
        height: height,
        margin: margin
    }
}

function updateMedalsByYear() {
    const { svg, x, y, xAxis, yAxis, chartGroup, width, height, margin } = medalsByYearChart;

    // filter out data based on currentYear
    let filteredData = globalData;
    if (currentYear !== 0) {
        filteredData = globalData.filter(d => d.year <= currentYear);
    }

    const medalsByCountry = new Map();
    
    // add up the medals by country
    filteredData.forEach(d => {
        const medalType = d.medal;
        
        // Initialize country data if not exists
        if (!medalsByCountry.has(d.team)) {
            medalsByCountry.set(d.team, { gold: 0, silver: 0, bronze: 0, total: 0});
        }
        
        // update individual medal counts (used for tooltip)
        const countryData = medalsByCountry.get(d.team);
        if (medalType === "Gold") {
            countryData.gold += 1;
            countryData.total += 1;
        } else if (medalType === "Silver") {
            countryData.silver += 1;
            countryData.total += 1;
        } else if (medalType === "Bronze") {
            countryData.bronze += 1;
            countryData.total += 1;
        }
    });

    // convert to array and sort by medal coun
    let medalData = Array.from(medalsByCountry, ([team, medals]) => ({
        team, 
        medals: medals.total, 
        gold: medals.gold, 
        silver: medals.silver, 
        bronze: medals.bronze
    })).sort((a, b) => b.medals - a.medals);
    
    const topCountries = 15;
    medalData = medalData.slice(0, topCountries);
    
    x.domain([0, d3.max(medalData, d => d.medals) * 1.1]);
    y.domain(medalData.map(d => d.team));
    
    // update axes
    xAxis.call(d3.axisBottom(x).ticks(5));
    yAxis.call(d3.axisLeft(y));
    
    // create or update the bars
    const bars = chartGroup.selectAll(".medal-bar")
        .data(medalData, d => d.team);

    const animDuration = isDragging ? 100 : 400;

    const tooltip = d3.select("#tooltip");
    
    bars.enter()
        .append("rect")
        .attr("class", "medal-bar")
        .attr("y", d => y(d.team))
        .attr("height", y.bandwidth())
        .attr("fill", colors.primary)
        .attr("x", 0)
        .attr("width", 0)
        .merge(bars)
        .transition()
        .duration(animDuration)
        .attr("y", d => y(d.team))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.medals))
        .attr("fill", colors.primary);
    
    bars.exit().transition().duration(animDuration).attr("width", 0).remove();

    chartGroup.selectAll(".medal-bar")
        .on("mouseenter", function(event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.team}</strong><br>
                    <span style="color:gold">Gold:</span> ${d.gold}<br>
                    <span style="color:silver">Silver:</span> ${d.silver}<br>
                    <span style="color:#cd7f32">Bronze:</span> ${d.bronze}<br>
                    <strong>Total Medals: ${d.medals}</strong>`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseleave", function() {
            tooltip.style("visibility", "hidden");
        });
    
    // labels showing the medal count
    const labels = chartGroup.selectAll(".medal-label")
        .data(medalData, d => d.team);
    
    labels.enter()
        .append("text")
        .attr("class", "medal-label")
        .attr("alignment-baseline", "middle")
        .merge(labels)
        .transition()
        .duration(animDuration)
        .attr("x", d => x(d.medals) + 5)
        .attr("y", d => y(d.team) + y.bandwidth()/2 + 6)
        .text(d => d.medals);
    
    labels.exit().remove();
    
    // axis labels
    if (chartGroup.select(".x-label").empty()) {
        chartGroup.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("x", (width - margin.left - margin.right) / 2)
            .attr("y", height - margin.top - margin.bottom + 50)
            .text("Total Medals");
    }

    const titleText = currentYear === 0 
        ? "All-time Olympic Medals by Team/Country (1896-2016)" 
        : `Olympic Medals by Team/Country (1896-${currentYear})`;
    
    if (chartGroup.select(".chart-title").empty()) {
        chartGroup.append("text")
            .attr("class", "chart-title")
            .attr("text-anchor", "middle")
            .attr("x", (width - margin.left - margin.right) / 2)
            .attr("y", -5)
            .text(titleText);
    } else {
        chartGroup.select(".chart-title").text(titleText);
    }

    console.log(`Medals by year data prepared for ${medalData.length} countries.`);
}

function initializeSportRecords() {
    // Create SVG
    const container = d3.select("#sport-records");
    const width = container.node().getBoundingClientRect().width;
    const height = 400;
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const margin = { top: 20, right: 20, bottom: 70, left: 120 };

    const chartGroup = svg.append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // x axis - year
    const x = d3.scaleLinear()
        .domain(yearRange)
        .range([0, width - margin.left - margin.right]);

    // y axis - total athletes competing in the selected sport
    const y = d3.scaleLinear()
        .range([height - margin.top - margin.bottom, 0]);

    // Create axes
    const xAxis = chartGroup.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);

    const yAxis = chartGroup.append("g")
        .attr("class", "y-axis axis");

    // Add axis labels
    chartGroup.append("text")
        .attr("class", "x-label")
        .attr("text-anchor", "middle")
        .attr("x", (width - margin.left - margin.right) / 2)
        .attr("y", height - margin.top - margin.bottom + 50)
        .text("Olympic Year");

    chartGroup.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -(height - margin.top - margin.bottom) / 2)
        .text("Number of Athletes");

    // Add chart title
    chartGroup.append("text")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("x", (width - margin.left - margin.right) / 2)
        .attr("y", -5)
        .text("Athletes by Olympic Year");

    // Store chart elements for later use
    sportRecordsChart = {
        svg: svg,
        x: x,
        y: y,
        xAxis: xAxis,
        yAxis: yAxis,
        chartGroup: chartGroup,
        width: width,
        height: height,
        margin: margin
    };

    // Populate sport dropdown
    populateSportDropdown();
}

function populateSportDropdown() {
    // Get unique sports from the data
    const sports = [...new Set(globalData.map(d => d.sport))].sort();
    
    // Populate the dropdown
    const sportSelect = document.getElementById('sport-select');
    
    // Clear existing options
    sportSelect.innerHTML = '';
    
    // Add a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a Sport';
    defaultOption.selected = true;
    defaultOption.disabled = true;
    sportSelect.appendChild(defaultOption);
    
    // Add options for each sport
    sports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.textContent = sport;
        sportSelect.appendChild(option);
    });
    
    // Set initial sport if none selected
    if (!currentSport && sports.length > 0) {
        currentSport = sports[0];
        sportSelect.value = currentSport;
    }
}

function updateSportRecords() {
    if (!currentSport) return; // Don't update if no sport is selected
    
    const { svg, x, y, xAxis, yAxis, chartGroup, width, height, margin } = sportRecordsChart;
    
    // Filter data for the selected sport
    const sportData = globalData.filter(d => d.sport === currentSport);
    
    // Group by year to count athletes
    const athletesByYear = Array.from(d3.group(sportData, d => d.year), ([year, values]) => {
        return {
            year: +year,
            count: values.length,
            // For highlighting the current year if selected
            isActive: (+year === currentYear) || (currentYear === 0)
        };
    }).sort((a, b) => a.year - b.year);
    
    // Update y axis domain based on max athlete count
    const maxCount = d3.max(athletesByYear, d => d.count);
    y.domain([0, maxCount * 1.1]); // Add 10% padding
    
    // Update axes
    xAxis.call(d3.axisBottom(x)
        .tickFormat(d => d % 4 === 0 ? d : '') // Show only Olympic years
        .ticks(10));
    yAxis.call(d3.axisLeft(y).ticks(5));
    
    // Create or update the line
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);
    
    // Add or update path
    const path = chartGroup.selectAll(".sport-line")
        .data([athletesByYear]);
    
    path.enter()
        .append("path")
        .attr("class", "sport-line")
        .attr("fill", "none")
        .attr("stroke", colors.primary)
        .attr("stroke-width", 3)
        .merge(path)
        .transition()
        .duration(400)
        .attr("d", line);
    
    // Add or update circles for each data point
    const circles = chartGroup.selectAll(".data-point")
        .data(athletesByYear);
    
    circles.enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("r", 5)
        .merge(circles)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("fill", d => d.year === currentYear ? colors.foreground : colors.primary)
        .attr("stroke", colors.background)
        .attr("stroke-width", 2)
        .attr("opacity", d => d.year === currentYear ? 1 : 0.7);
    
    circles.exit().remove();
    
    // Update tooltip
    const tooltip = d3.select("#tooltip");
    
    chartGroup.selectAll(".data-point")
        .on("mouseenter", function(event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${currentSport}</strong><br>
                    Year: ${d.year}<br>
                    Athletes: ${d.count}`);
            
            d3.select(this)
                .attr("r", 7)
                .attr("opacity", 1);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseleave", function(event, d) {
            tooltip.style("visibility", "hidden");
            
            d3.select(this)
                .attr("r", 5)
                .attr("opacity", d.year === currentYear ? 1 : 0.7);
        })
        .on("click", function(event, d) {
            // Update current year on click
            const yearSlider = document.getElementById('year-slider');
            const yearDisplay = document.getElementById('year-display');
            
            if (d.year === currentYear) {
                currentYear = 0;
                yearSlider.value = yearSlider.min;
                yearDisplay.textContent = "None Selected";
            } else {
                currentYear = d.year;
                yearSlider.value = d.year;
                yearDisplay.textContent = d.year;
            }
            
            updateVisualizations();
        });
    
    // Update chart title
    chartGroup.select(".chart-title")
        .text(`${currentSport} Athletes by Olympic Year`);
    
    console.log(`Updated sport records chart for ${currentSport}`);
}

