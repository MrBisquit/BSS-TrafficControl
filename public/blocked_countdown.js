function start() {
        var x = setInterval(function() {
        var now = new Date().getTime();
  
        var distance = countDownDate - now;
  
        var weeks = Math.floor(distance / (1000 * 60 * 60 * 24 * 7));
        var months = Math.floor(weeks / 4);

        weeks = weeks % 4;

        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
        document.getElementById("countdown").innerHTML = days + "d " + hours + "h "
        + minutes + "m " + seconds + "s ";
  
        if (distance < 0) {
            clearInterval(x);
            location.reload();
        }
    }, 1000);
}

setTimeout(start, 0);