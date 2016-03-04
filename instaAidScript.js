

google.charts.load('current', {packages: ['corechart', 'bar', 'table', 'calendar', 'gauge']});



var myFirebaseRef = new Firebase("https://bostonhome.firebaseio.com/"); /*demoinstaaid*/


var dataDict = []; // create an empty array
var usersDict = [];
var lastValidRequestByUser = [];
var responseTimes = [];

var data = [['Request', 'Count']];

var STANDARD_REQUESTS = ['Video Chat Initiated', 'Custom Request', 'Send Aid',  'Bring water', 'Send a nurse', 'EMERGENCY!! Send help immediately!!!'];

var select = document.getElementById("user");

var selectDate = document.getElementById("dataSince");

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

var START_DATE = new Date(2015,0);
var breakDownChart;

var all_requests = [];


var d = new Date();
todayMonth = d.getMonth();
todayYear = d.getFullYear();
var THIS_MONTH = new Date(todayYear, todayMonth, 1);

function iosDateStringToDate(ts) {
	/*2016-02-26 13:31:52*/
	year = parseInt(ts.substring(0,4));
	month = parseInt(ts.substring(5,7)) - 1; /* the first month is '0'*/
	day = parseInt(ts.substring(8,10));
	hour = parseInt(ts.substring(11,13));
	minute = parseInt(ts.substring(14,16));
	second = parseInt(ts.substring(17,19));
	return new Date(year, month, day, hour, minute, second);
}

function msToTime(duration) {
	var milliseconds = parseInt((duration%1000)/100)
	, seconds = parseInt((duration/1000)%60)
	, minutes = parseInt((duration/(1000*60))%60)
	, hours = parseInt((duration/(1000*60*60))%24);


	hours = (hours < 10) ? "0" + hours : hours;
	minutes = (minutes < 10) ? "0" + minutes : minutes;
	seconds = (seconds < 10) ? "0" + seconds : seconds;

	return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}


myFirebaseRef.child("log").on("value", function(snapshot) {

	snapshot.forEach(function(childSnapshot) {
		
		request = String(childSnapshot.val().text);
		timestamp = String(childSnapshot.val().timestamp);
		user = String(childSnapshot.val().user);

  		/*
       Strange anomaloy in apple's dating convention, seems like dates at the end
       of the year (December 28-31) took on the wrong year, so correcting this here...
       */
       var dateTimeStamp = iosDateStringToDate(timestamp)
       if (dateTimeStamp.getFullYear() == 2016 && dateTimeStamp.getMonth() == 11 ) {
       	timestamp = "2015" + timestamp.substring(4);
       }


       if (!(request in dataDict )) {
       	dataDict[request] = [[user, timestamp]];
       }
       else {
       	dataDict[request].push([user, timestamp]);
       }

       if (!(user in usersDict )) {
       	usersDict[user] = [[request, timestamp]];
       }
       else {
       	usersDict[user].push([request, timestamp]);
       }

       all_requests.push([request,timestamp,user]);

       if (request.toLowerCase() == "nurse processed request" ) {
       	if (lastValidRequestByUser[user] != undefined) {
       		requestTimeStamp = lastValidRequestByUser[user][0];
       		requestFromUser = lastValidRequestByUser[user][1];
       		lastValidRequestByUser[user] = [];
       		if (requestTimeStamp != undefined) {
       			responseTimes.push([requestTimeStamp, timestamp, requestFromUser, user]);
       		}
       	}


       }
       else {
       	if (request.toLowerCase() != "nurse cancelled request") {
       		lastValidRequestByUser[user] = [timestamp, request] ;
       	}

       }


   });

requestBreakdownChart(START_DATE);

requestsByUserChart();

/* updateGauge(START_DATE); I don't think this helps much actually.... */

updateLatestRequestsTable(THIS_MONTH); 

updateResponseTimeStatus();

countTotalRequests();

});

function updateLatestRequestsTable(dataSince) {
	var requestData = new google.visualization.DataTable();

	requestData.addColumn('string', 'Item');
	requestData.addColumn('string', 'Timestamp');
	requestData.addColumn('string', 'User');
	for (var i = 0; i < all_requests.length; i++) {
		request = all_requests[i][0];
		timestamp = all_requests[i][1];
		user = all_requests[i][2];

		if (iosDateStringToDate(timestamp).getFullYear() == dataSince.getFullYear() && iosDateStringToDate(timestamp).getMonth() == dataSince.getMonth()) {

			requestData.addRow(all_requests[i]);
		}

	}

	var table = new google.visualization.Table(document.getElementById('all_items_table_div'));

	table.draw(requestData, {showRowNumber: true, width: '100%', height: '100%'});

}


function latestRequests(dataSince) {
	var requestData = new google.visualization.DataTable();

	usersData.addColumn('string', 'Name');

}


function requestsByUserChart(){
	var usersData = new google.visualization.DataTable();

	usersData.addColumn('string', 'Name');


	for (var i = 0; i < STANDARD_REQUESTS.length; i++) {
		if (STANDARD_REQUESTS[i] == "EMERGENCY!! Send help immediately!!!"){
			usersData.addColumn('number', "Emergency!");
		}
		else {
			usersData.addColumn('number', STANDARD_REQUESTS[i]);
		}
	}
	usersData.addColumn('number', 'TOTAL REQUESTS');

	var EXTRA_ITEMS_LOGGED = ['Nurse processed request', 'User cancelled request', 'Nurse cancelled request'];

	for (var i = 0; i < EXTRA_ITEMS_LOGGED.length; i++) {
		usersData.addColumn('number', EXTRA_ITEMS_LOGGED[i]);
	}
	for (var user in usersDict) {
		sortedUserData = [];

		for (var i = 0; i < STANDARD_REQUESTS.length; i++) {
			sortedUserData[STANDARD_REQUESTS[i]] = 0 ;

		}

		for (var i = 0; i < EXTRA_ITEMS_LOGGED.length; i++) {
			sortedUserData[EXTRA_ITEMS_LOGGED[i]] = 0 ;

		}

		var totalRequests = 0;
		for (var i = 0; i < usersDict[user].length; i++) {
			r = usersDict[user][i][0];


			if (STANDARD_REQUESTS.indexOf(r) >= 0) {
				sortedUserData[r]+=1 ;
				totalRequests +=1;
			}
			else {

				if (!(EXTRA_ITEMS_LOGGED.indexOf(r) >= 0)) {
					totalRequests +=1;
					
					sortedUserData['Custom Request'] += 1;
				}
				else {
					sortedUserData[r] +=1;
				}

			}
		}

		tableData = [user];
		for (var i = 0; i < STANDARD_REQUESTS.length; i++){
			request = STANDARD_REQUESTS[i]
			tableData.push(sortedUserData[request]);

		}
		tableData.push(totalRequests);
		for (var i = 0; i < EXTRA_ITEMS_LOGGED.length; i++){
			request = EXTRA_ITEMS_LOGGED[i]
			tableData.push(sortedUserData[request]);

		}

		usersData.addRow(tableData)
		
	}


	for (var user in usersDict) {

		var el = document.createElement("option");
		el.textContent = user;
		el.value = user;
		select.appendChild(el);
	}

	var date = new Date();
	todayMonth = date.getMonth();
	todayYear = date.getFullYear();
	year = 2015;

	while (year <= todayYear ) {

		for(var i = 0; i < MONTHS.length; i++) {
			if (year != todayYear || i <= todayMonth) {
				var el = document.createElement("option");
				el.textContent = MONTHS[i] + " " + year;
				el.value = MONTHS[i] + " " + year;
				selectDate.appendChild(el);
			}
		}
		year += 1;

	}

	var table = new google.visualization.Table(document.getElementById('table_div'));

	table.draw(usersData, {showRowNumber: false, width: '100%', height: '100%', frozenColumns:1, sortColumn:7, sortAscending:false});


	drawChartAllUsers();

	countRequestsThisMonth();

	topUsersRecently();

}

function topUsersRecently() {
	var count = 0;
	var date = new Date();
	var d = new Date(date.getFullYear(), date.getMonth(), 1);

	top_users = [];
	
	listOfRequests = all_requests.slice(0);
	listOfRequests.reverse();
	var i = 0;
	while (top_users.length <= 2) {

		next_user = listOfRequests[i][2];
		if (top_users.indexOf(next_user) == -1) {
			top_users.push(next_user)
		}
		i+=1;
	}

	document.getElementById("userOne").innerHTML = top_users[0] ;
	document.getElementById("userTwo").innerHTML = top_users[1] ;
	document.getElementById("userThree").innerHTML = top_users[2] ;
}



function countRequestsThisMonth() {
	var count = 0;
	var date = new Date();
	var d = new Date(date.getFullYear(), date.getMonth(), 1);

	listOfRequests = all_requests.slice(0);
	listOfRequests.reverse();
	for (var i = 0 ; i < listOfRequests.length; i++) { 
		if (iosDateStringToDate(listOfRequests[i][1]) > d) {

			if (STANDARD_REQUESTS.indexOf(listOfRequests[i][0]) > -1) {
				count += 1;
			}
			else {
				NOT_IN = ['user cancelled request', 'nurse processed request', 'nurse cancelled request'];
				if (NOT_IN.indexOf(listOfRequests[i][0].toLowerCase()) == -1) {
					count+=1;
				}
			}
		}
	}

	document.getElementById("requestsThisMonthStatus").innerHTML = count.toString() ;
}



function countTotalRequests() {
	var count = 0;
	for (var key in dataDict) {
		if (STANDARD_REQUESTS.indexOf(key) > -1) {
			count += dataDict[key].length;
		}
		else {
			NOT_IN = ['user cancelled request', 'nurse processed request', 'nurse cancelled request'];
			if (NOT_IN.indexOf(key.toLowerCase()) == -1) {
				count+=1;
			}

		}
	}

	document.getElementById("totalRequestsStatus").innerHTML = count.toString() ;
}

function requestBreakdownChart(dataSince) {

	var customRequest = 0;
	for (var key in dataDict) {

		if (STANDARD_REQUESTS.indexOf(key) > -1) {
			var count = 0;
			for (var i = 0; i < dataDict[key].length; i++) {

				if (iosDateStringToDate(dataDict[key][i][1]) > dataSince) {
					count += 1;
				}
			}
			data.push([key, count ]);
		}
		else {
			customRequest += 1;
		}
	}
	data.push(["Custom Text Request", customRequest ]);
	
	function Comparator(a,b){
		if (a[1] < b[1]) return 1;
		if (a[1] > b[1]) return -1;
		return 0;
	}

	data.sort(Comparator);
	

	var options = {

		chartArea: {width: '50%', left:'30%'},
		isStacked: true,
		hAxis: {
			title: 'Count',
			minValue: 0,
		},
		vAxis: {
			title: 'Request'
		},
		legend: {
			position: 'none'
		} 
	};

	breakDownChart = new google.visualization.BarChart(document.getElementById('chart_div'));
	breakDownChart.draw(google.visualization.arrayToDataTable(data), options); 

}



function averageOfArray(arrayIn){
	var total = 0;
	for(var i = 0; i < arrayIn.length; i++) {
		total += arrayIn[i];
	}
	var avg = total / arrayIn.length
	return avg;
}

function median(values) {

	values.sort( function(a,b) {return a - b;} );

	var half = Math.floor(values.length/2);

	if(values.length % 2)
		return values[half];
	else
		return (values[half-1] + values[half]) / 2.0;
}

function dataSince(){
	var myselect = document.getElementById("dataSince");
	var dateSelected = myselect.options[myselect.selectedIndex].value;

	var res = dateSelected.split(" ");
	month = MONTHS.indexOf(res[0]);
	year = parseInt(res[1]);

	var dataSince = new Date(year, month);
	/* updateGauge(dataSince); */

	updateLatestRequestsTable(dataSince) ;

	/*requestBreakdownChart(dataSince); This causes errors when I try to re-draw the bar chart. no fair :( */
}

function updateResponseTimeStatus(){
	var d = new Date();

	var sec = getUpdateResponseTime(new Date(d.getFullYear(),d.getMonth(),1));
	document.getElementById("responseTime").innerHTML = sec.toString() + " sec";

}

function updateGauge(dataSince){
	var seconds = getUpdateResponseTime(dataSince);

	drawGauge(seconds);
}

function getUpdateResponseTime(dataSince){
	justResponseTimes = []
	for (var i = 0; i < responseTimes.length; i++) {
		requestTimeStamp = responseTimes[i][0];
		timestamp = responseTimes[i][1];

		if (iosDateStringToDate(requestTimeStamp) > dataSince) {

			request = responseTimes[i][2];
			user = responseTimes[i][3];
			

			var millisecondsDiff = iosDateStringToDate(timestamp) - iosDateStringToDate(requestTimeStamp);
			
			hours = parseInt((millisecondsDiff/(1000*60*60))%24);
			if (millisecondsDiff > 0.0  ) {
				justResponseTimes.push(millisecondsDiff);
				
			}
		}
		
	}
	if (justResponseTimes.length == 0) {
		alert("No requests yet");
		medianMilliseconds = 0.0;
	}
	else{
		medianMilliseconds = median(justResponseTimes);
	}
	seconds = medianMilliseconds/1000;

	var minutes = medianMilliseconds / 60000;

	return seconds;


}


function drawGauge(timeInSeconds) {
	var data = google.visualization.arrayToDataTable([
		['Label', 'Value'],
		['Response Time', timeInSeconds]
		]);

	var options = {
		width: 300, height: 300,
		redFrom: 180, redTo: 300,
		yellowFrom:60, yellowTo: 180,
		greenFrom: 0, greenTo: 60,
		majorTicks: 30,
		max:300
	};

	var chart = new google.visualization.Gauge(document.getElementById('gauge_div'));

	chart.draw(data, options);
}

function getDataForUser(user, timestampsCount) {

	var totalRequests = 0;
	for (var i = 0; i < usersDict[user].length; i++) {
		ts = usersDict[user][i][1].substring(0,10);

		if (!(ts in timestampsCount )) {
			timestampsCount[ts] = 1;
		}
		else {
			timestampsCount[ts] += 1;
		}
	}
	return timestampsCount;

}

function userSelected() {
	var myselect = document.getElementById("user");
	var userSelected = myselect.options[myselect.selectedIndex].value;
	if (userSelected == "ALL USERS") {
		drawChartAllUsers();
	}
	else {
		drawChart(getDataForUser(userSelected, []));
	}
}


function drawChartAllUsers() {
	timestampsCount = [];
	for (var user in usersDict) {
		timestampsCount = getDataForUser(user, timestampsCount);
	}
	drawChart(timestampsCount);

}


function drawChart(timestampsCount) {

	var dataTable = new google.visualization.DataTable();
	dataTable.addColumn({ type: 'date', id: 'Date' });
	dataTable.addColumn({ type: 'number', id: 'Won/Loss' });

	for (ts in timestampsCount) {

		year = parseInt(ts.substring(0,4));
		month = parseInt(ts.substring(5,7)) - 1; /* the first month is '0'*/
		day = parseInt(ts.substring(8,10));
		count = timestampsCount[ts];


		if (count > 40) {
			count = 40;
		}

		if (year > 2014) {
			dataTable.addRow([ new Date(year, month, day), count]);
		}


	}

	var chart = new google.visualization.Calendar(document.getElementById('calendar_basic'));

	var options = {

	};

	chart.draw(dataTable, options);

}
