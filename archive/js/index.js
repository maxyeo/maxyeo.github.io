//SMOOTH SCROLLING
$(function() {
  $('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 1000);
        return false;
      }
    }
  });
});

//border wdth for portfolio triangles
$(document).ready(function() {
  size();
});
$(window).resize(function() {
  size();
});
function size() {
  var w = $(window).width();
  $("#f-tri").css("border-right-width",2*w/3);
  $("#b-tri").css("border-left-width",2*w/3);
}

// on scroll load actions
var helpers = {
    mark: $(window).height() - 200,
};

var scrollPos = $(window).scrollTop() + helpers.mark;
var targets = $(".work");

var buttonRising = function(button, btnPos, scrollPos){
    if(scrollPos > btnPos){
        button.addClass("jam");
    }
};

targets.each(function(){
    var target = $(this);
    var topPos = target.offset().top; 
    $(window).scroll(function() {
        scrollPos = $(window).scrollTop() + helpers.mark;
        buttonRising(target, topPos, scrollPos);
    });
});

// youtube
var tag = document.createElement('script');
tag.src = "http://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('ytplayer', {
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    player.mute();
    player.playVideo();
}