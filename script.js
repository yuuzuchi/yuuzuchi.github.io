let globalData;
let currentYear = 0; // 0 means show all years
const yearRange = [1896, 2016];
const warPeriods = [
    { start: 1912, end: 1920, label: "WWI" },
    { start: 1936, end: 1948, label: "WWII" }
];
let currentStat = 'height';
let currentSport = ''; // Track the selected sport
let isDragging = false; // disable certain animations when dragging slider
let isPlaying = false; // Track if the play button is active
let animationInterval; // Store the interval ID for animation
const animationSpeed = 150; // Speed of the animation in milliseconds

// Global colors object
const colors = {
    foreground: "#111",
    primary: "#daa520",
    secondary: "#f0dea3",
    lightgray: "#f0f0f0",
    background: "#f4f4f4"
};

// Add this function after the colors object definition
function getCountryColor(countryName) {
    const countryColors = {
        "United States": "#3C3B6E",
        "Soviet Union": "#CC0000",
        "Russia": "#0039A6",
        "Germany": "#FFCC00",
        "East Germany": "#000000",
        "West Germany": "#FFCC00",
        "China": "#DE2910",
        "Great Britain": "#012169",
        "Japan": "#BC002D",
        "France": "#0055A4",
        "Italy": "#008C45",
        "Australia": "#00843D",
        "Canada": "#FF0000",
        "South Korea": "#0047A0",
        "Brazil": "#009C3B",
        "Netherlands": "#FF9B00",
        "Sweden": "#006AA7",
        "Hungary": "#CD2A3E",
        "Romania": "#002B7F",
        "Cuba": "#0018A8",
        "Finland": "#002F6C",
        "Norway": "#BA0C2F",
        "Spain": "#AA151B",
        "Poland": "#DC143C",
        "Bulgaria": "#00966E",
        "Switzerland": "#FF0000",
        "New Zealand": "#000000",
        "Denmark": "#C8102E",
        "Ukraine": "#0057B7",
        "Belgium": "#000000",
        "Greece": "#0D5EAF",
        "Austria": "#ED2939",
        "Turkey": "#E30A17",
    };

    if (countryColors[countryName]) {
        return countryColors[countryName];
    }

    return colors.primary;
}

// global chart variables
let statsChart = {};
let womenParticipationChart = {};
let medalsByYearChart = {};
let sportRecordsChart = {};

d3.csv("/olympics_cleaned.csv").then(data => {
    data.forEach(d => {
        d.age = +d.age;
        d.height = +d.height;
        d.weight = +d.weight;
        d.year = +d.year;
    });

    globalData = data;

    initializeEventListeners();
    initializeVisualizations();
});

function initializeEventListeners() {
    // Initialize event listeners
    const statSelect = document.getElementById('stat-select');
    const yearSlider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');
    const sportSelect = document.getElementById('sport-select');
    const playPauseButton = document.getElementById('playpause-button');

    // Add event listeners for sport navigation buttons
    const prevSportButton = document.getElementById('prev-sport');
    const nextSportButton = document.getElementById('next-sport');

    if (prevSportButton) {
        prevSportButton.addEventListener('click', () => navigateSports('prev'));
    }

    if (nextSportButton) {
        nextSportButton.addEventListener('click', () => navigateSports('next'));
    }

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
        const closestYear = findClosestOlympicYear(+e.target.value);

        yearDisplay.textContent = closestYear;
        if (currentYear !== closestYear) {
            currentYear = +closestYear;
            e.target.value = closestYear;
            updateVisualizations();
        }
    });

    statSelect.addEventListener('change', (e) => {
        currentStat = e.target.value;
        updateVisualizations();
    });

    if (sportSelect) {
        sportSelect.addEventListener('change', (e) => {
            currentSport = e.target.value;
            updateSportRecords();
        });
    }

    if (playPauseButton) {
        playPauseButton.addEventListener('click', togglePlayPause);
    }
}

function navigateSports(direction) {
    const sportSelect = document.getElementById('sport-select');
    const options = Array.from(sportSelect.options);
    const currentIndex = options.findIndex(option => option.value === currentSport);

    let newIndex;
    if (direction === 'next') {
        // wrap around to start if at end
        newIndex = (currentIndex + 1) % options.length;
    } else {
        newIndex = (currentIndex - 1 + options.length) % options.length;
    }

    // update selection
    sportSelect.selectedIndex = newIndex;
    currentSport = options[newIndex].value;

    updateSportRecords();
}

function togglePlayPause() {
    const playPauseButton = document.getElementById('playpause-button');
    isPlaying = !isPlaying;

    if (isPlaying) {
        playPauseButton.innerHTML = '&#x23F8;&#xFE0E;';
        startYearAnimation();
    } else {
        playPauseButton.innerHTML = '&#x23F5;&#xFE0E;';
        stopYearAnimation();
    }
}

function startYearAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    const yearSlider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');

    // If at the end, start from beginning
    console.log(currentYear, yearRange[1]);
    if (currentYear >= yearRange[1] || currentYear === 0) {
        currentYear = yearRange[0];
        yearSlider.value = currentYear;
    }

    animationInterval = setInterval(() => {
        if (!isPlaying) return;

        const currentSliderValue = parseFloat(yearSlider.value);
        const newValue = Math.min(currentSliderValue + 1, yearRange[1]);
        yearSlider.value = newValue;

        const closestYear = findClosestOlympicYear(newValue);

        if (closestYear !== currentYear) {
            currentYear = closestYear;
            yearDisplay.textContent = currentYear;
            updateVisualizations();
        }

        if (newValue >= yearRange[1]) {
            togglePlayPause();
        }
    }, animationSpeed);
}

function stopYearAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

function findClosestOlympicYear(year) {
    // find Olympic years in the data
    const olympicYears = [...new Set(globalData.map(d => d.year))].sort();

    // find closest year
    return olympicYears.reduce((prev, curr) => {
        return Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev;
    });
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

    // background rect to capture clicks
    chartGroup.append("rect")
        .attr("class", "chart-background")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "transparent")
        .on("click", function () {
            // reset selection - update UI
            currentYear = 0;
            const yearDisplay = document.getElementById('year-display');
            if (yearDisplay) yearDisplay.textContent = "None Selected";
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
    const { svg, x, y, xAxis, yAxis, chartGroup, width, height, margin } = statsChart;
    const animDuration = isDragging ? 50 : 400;
    // update scale max if current stat is set
    const maxValue = d3.max(globalData, d => d[currentStat]);

    // generate custom ticks for x axis
    let ticks = [];
    // Use the padded range to generate ticks - get this from the scale's domain
    const paddedDomain = x.domain();
    for (let year = Math.floor(paddedDomain[0] / 4) * 4; year <= paddedDomain[1]; year += 4) {
        ticks.push(year);
    }

    // Update axes
    xAxis.call(d3.axisBottom(x)
        .tickFormat(d => d % 2 === 0 ? d : '')
        .tickValues(ticks)); // Show only even years (olympic winter/summer)

    y.domain([0, maxValue]);
    yAxis.call(d3.axisLeft(y));

    // Add war period rectangles
    const warRects = chartGroup.selectAll(".war-period")
        .data(warPeriods);

    warRects.enter()
        .append("rect")
        .attr("class", "war-period")
        .attr("x", d => x(d.start))
        .attr("y", 0)
        .attr("width", d => x(d.end) - x(d.start))
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", colors.lightgray)
        .merge(warRects)
        .transition()
        .duration(animDuration)
        .attr("x", d => x(d.start + 2))
        .attr("width", d => x(d.end - 4) - x(d.start))
        .attr("opacity", currentYear === 0 ? 1 : 0.5); // Set opacity based on current year

    warRects.exit().remove();

    // Add labels for war periods
    const warLabels = chartGroup.selectAll(".war-label")
        .data(warPeriods);

    console.log(`Current year: ${currentYear}`);

    warLabels.enter()
        .append("text")
        .attr("class", "war-label")
        .attr("text-anchor", "middle")
        .attr("fill", colors.foreground)
        .attr("font-size", "12px")
        .merge(warLabels)
        .transition()
        .duration(animDuration)
        .attr("x", d => x(d.start) + (x(d.end) - x(d.start)) / 2)
        .attr("y", 20)
        .attr("opacity", currentYear === 0 ? 0.7 : 0.3)
        .text(d => d.label);

    warLabels.exit().remove();

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
        .on("mouseenter", function (event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.year}</strong><br>
                    Max: ${d.max.toFixed(1)}<br>
                    Avg: ${d.avg.toFixed(1)}<br>
                    Min: ${d.min.toFixed(1)}`);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseleave", function () {
            tooltip.style("visibility", "hidden");
        })
        .on("click", function (event, d) {
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
        .attr("stroke", "transparent")
        .attr("stroke-width", 24)       // Wider than visible line for easier hovering
        .attr("x1", d => x(d.year))
        .attr("x2", d => x(d.year))
        .attr("y1", d => y(d.min) - 5)
        .attr("y2", d => y(d.max) + 5);

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
        .attr("opacity", d => d.isActive ? 1.0 : 0.3);

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
        .attr("opacity", d => d.isActive ? 1.0 : 0.3);

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
        .attr("opacity", d => d.isActive ? 1.0 : 0.3);

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
        .attr("opacity", d => d.isActive ? 1.0 : 0.3);

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
            medalsByCountry.set(d.team, { gold: 0, silver: 0, bronze: 0, total: 0 });
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

    // convert to array and sort by medal count
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

    // Use longer animation duration when playing for smoother transitions
    const animDuration = isDragging ? 100 : (isPlaying ? 400 : 400);

    const tooltip = d3.select("#tooltip");

    bars.enter()
        .append("rect")
        .attr("class", "medal-bar")
        .attr("y", d => y(d.team))
        .attr("height", y.bandwidth())
        .attr("fill", d => getCountryColor(d.team)) // country specific colors
        .attr("x", 0)
        .attr("width", 0)
        .merge(bars)
        .transition()
        .duration(animDuration)
        .ease(isPlaying ? d3.easeLinear : d3.easeCubic) // linear to avoid jitteryness
        .attr("y", d => y(d.team))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.medals))
        .attr("fill", d => getCountryColor(d.team)); 

    bars.exit().transition().duration(animDuration).ease(d3.easeLinear).attr("width", 0).remove();

    chartGroup.selectAll(".medal-bar")
        .on("mouseenter", function (event, d) {

            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.team} - #${medalData.findIndex(item => item.team === d.team) + 1}</strong><br>
                    <span style="color:gold">Gold:</span> ${d.gold}<br>
                    <span style="color:silver">Silver:</span> ${d.silver}<br>
                    <span style="color:#cd7f32">Bronze:</span> ${d.bronze}<br>
                    <strong>Total Medals: ${d.medals}</strong>`);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseleave", function () {
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
        .ease(isPlaying ? d3.easeLinear : d3.easeCubic) // Add linear easing
        .attr("x", d => x(d.medals) + 5)
        .attr("y", d => y(d.team) + y.bandwidth() / 2 + 6)
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

    // total country count label
    const totalCountriesLabel = chartGroup.select(".total-countries-label");
    
    // Create or update the total countries label
    if (totalCountriesLabel.empty()) {
        chartGroup.append("text")
            .attr("class", "total-countries-label")
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("fill", colors.foreground);
    }
    
    // Update the label position and text
    chartGroup.select(".total-countries-label")
        .attr("x", width - margin.left - margin.right - 10)
        .attr("y", height - margin.top - margin.bottom - 10)
        .text(`Total countries with medals: ${medalsByCountry.size}`);

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
}

function initializeSportRecords() {
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

    const xAxis = chartGroup.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);

    const yAxis = chartGroup.append("g")
        .attr("class", "y-axis axis");

    // axis labels
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

    // chart title
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

    populateSportDropdown();
}

function populateSportDropdown() {
    // Get unique sports from the data
    const sports = [...new Set(globalData.map(d => d.sport))].sort();

    const sportSelect = document.getElementById('sport-select');

    sportSelect.innerHTML = '';

    // add default "All sports" option
    const allSportsOption = document.createElement('option');
    allSportsOption.value = 'All';
    allSportsOption.textContent = 'All sports';
    sportSelect.appendChild(allSportsOption);

    // Add options for each sport
    sports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.textContent = sport;
        sportSelect.appendChild(option);
    });

    // initial sport "All sports"
    currentSport = 'All';
    sportSelect.value = 'All';
}

function updateSportRecords() {
    const { svg, x, y, xAxis, yAxis, chartGroup, width, height, margin } = sportRecordsChart;

    // Filter data - either all sports or selected sport
    let sportData;
    if (currentSport === 'All') {
        sportData = globalData; // use all data if default "all sports" selected
    } else {
        sportData = globalData.filter(d => d.sport === currentSport);
    }

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
    y.domain([0, maxCount * 1.1]); // pad

    // Update axes
    xAxis.call(d3.axisBottom(x)
    .tickFormat(d => d % 4 === 0 ? d : '') // Show only Olympic years
    .ticks(10));
    yAxis.call(d3.axisLeft(y).ticks(5));
    
    // break  line where there are no olympic events (due to world wars)
    const segments = [];
    let currentSegment = [];
    
    athletesByYear.forEach(d => {
        const isWarEndYear = warPeriods.some(period => d.year === period.end);
        if (isWarEndYear) {
            if (currentSegment.length > 0) {
                segments.push([...currentSegment]);
                currentSegment = [];
                currentSegment.push(d); // Start a new segment with the current year
            }
        } else {
            // For normal years, add to the current segment
            currentSegment.push(d);
        }
    });

    // Add the last segment if it has points
    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

    const paths = chartGroup.selectAll(".sport-line")
        .data(segments);

    paths.exit().remove();

    paths.enter()
        .append("path")
        .attr("class", "sport-line")
        .attr("fill", "none")
        .attr("stroke", colors.primary)
        .attr("stroke-width", 3)
        .merge(paths)
        .transition()
        .duration(300)
        .attr("d", line);

    // light gray box indicating the years with no olympics
    const warRects = chartGroup.selectAll(".war-period")
        .data(warPeriods);

    warRects.enter()
        .append("rect")
        .attr("class", "war-period")
        .attr("x", d => x(d.start))
        .attr("y", 0)
        .attr("width", d => x(d.end) - x(d.start))
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", colors.lightgray)
        .merge(warRects)
        .transition()
        .duration(300)
        .attr("x", d => x(d.start))
        .attr("width", d => x(d.end) - x(d.start));

    warRects.exit().remove();

    // Add labels for war periods
    const warLabels = chartGroup.selectAll(".war-label")
        .data(warPeriods);

    warLabels.enter()
        .append("text")
        .attr("class", "war-label")
        .attr("text-anchor", "middle")
        .attr("fill", colors.foreground)
        .attr("opacity", 0.7)
        .attr("font-size", "12px")
        .merge(warLabels)
        .attr("x", d => x(d.start) + (x(d.end) - x(d.start)) / 2)
        .attr("y", 20)
        .text(d => d.label);

    warLabels.exit().remove();

    // clickable circles for each data point
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

    //Update tooltip
    const tooltip = d3.select("#tooltip");

    chartGroup.selectAll(".data-point")
        .on("mouseenter", function (event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${currentSport === 'All' ? 'All sports' : currentSport}</strong><br>
                    Year: ${d.year}<br>
                    Athletes: ${d.count}`);

            d3.select(this)
                .attr("r", 7)
                .attr("opacity", 1);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseleave", function (event, d) {
            tooltip.style("visibility", "hidden");

            d3.select(this)
                .attr("r", 5)
                .attr("opacity", d.year === currentYear ? 1 : 0.7);
        })
        .on("click", function (event, d) {
            // Update current year on click
            const yearSlider = document.getElementById('year-slider');
            const yearDisplay = document.getElementById('year-display');

            // reset if clicked again
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
        .text(`${currentSport === 'All' ? 'All' : currentSport} Athletes by Olympic Year`);

    console.log(`Updated sport records chart for ${currentSport === 'All' ? 'all sports' : currentSport}`);
}


