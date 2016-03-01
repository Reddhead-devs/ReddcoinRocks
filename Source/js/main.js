var reddcoinRocks = angular.module('reddcoinRocks', ['ngAnimate', 'ipCookie', 'pusher-angular', 'ngActivityIndicator', 'ui.bootstrap', '720kb.socialshare', 'monospaced.qrcode', 'timer', 'angulartics', 'angulartics.google.analytics']);
var socket = io("http://live.reddcoin.com/");

jQuery.cachedScript = function( url, options ) {
	options = $.extend( options || {}, {
		dataType: "script",
		cache: true,
		url: url
	});
	return jQuery.ajax( options );
};

reddcoinRocks.directive('selectOnClick', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('click', function () {
                this.select();
            });
        }
    };
});

reddcoinRocks.filter('humanize', function(){
	return function(number, decimals, decPoint, thousandsSep) {
		decimals = isNaN(decimals) ? 2 : Math.abs(decimals);
		decPoint = (decPoint === undefined) ? '.' : decPoint;
		thousandsSep = (thousandsSep === undefined) ? ',' : thousandsSep;
		var sign = number < 0 ? '-' : '';
		number = Math.abs(+number || 0);
		var intPart = parseInt(number.toFixed(decimals), 10) + '';
		var j = intPart.length > 3 ? intPart.length % 3 : 0;
		return sign + (j ? intPart.substr(0, j) + thousandsSep : '') + intPart.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thousandsSep) + (decimals ? decPoint + Math.abs(number - intPart).toFixed(decimals).slice(2) : '');
	};
});

reddcoinRocks.directive('compile', ['$compile', function ($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                // watch the 'compile' expression for changes
                return scope.$eval(attrs.compile);
            },
            function(value) {
                // when the 'compile' expression changes
                // assign it into the current DOM
                element.html(value);

                // compile the new DOM and link it to the current
                // scope.
                // NOTE: we only compile .childNodes so that
                // we don't get into infinite loop compiling ourselves
                $compile(element.contents())(scope);
            }
        );
    };
}])

reddcoinRocks.service('rddPriceService', ['$http', function($http) {
	this.getPrice = function() {
		return $http({
			url: 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D%22' + encodeURIComponent('https://bittrex.com/api/v1.1/public/getticker?market=BTC-RDD') + '%22&format=json'
		});
	};
}]);

reddcoinRocks.service('btcPriceService', ['$http', function($http) {
	this.getPrice = function() {
		return $http({
			url: 'https://api.bitcoinaverage.com/exchanges/USD'
		});
	};
}]);

reddcoinRocks.service('rddTxService', ['$http', function($http) {
	this.getTransactionData = function(tx) {
		return $http({
			url: 'http://live.reddcoin.com/api/tx/' + tx
		});
	};
}]);

reddcoinRocks.service('rddTxListService', ['$http', function($http) {
	this.getTransactionData = function(wallet) {
		return $http({
			url: 'http://live.reddcoin.com/api/txs?address=' + wallet + '&pageNum=0'
		});
	};
}]);

reddcoinRocks.service('rddShortUrlService', ['$http', function($http) {
	this.getShortUrl = function(url) {
		return $http({
		    url: 'http://rdd.pw/yourls-api.php',
		    method: "JSONP",
		    params: {
		    	callback: "JSON_CALLBACK",
		    	username: "reddcoinrocks",
		    	password: "password",
		    	action:   "shorturl",
		    	format:   "jsonp",
		    	title:    "Reddcoin Rocks!",
		    	url: 	  url
		    }
		 });
	};
}]);

reddcoinRocks.controller('walletData', ['$scope', '$filter', '$timeout', '$http', 'rddTxService', 'rddTxListService', 'rddShortUrlService', 'ipCookie', '$modal', '$sce', function ($scope, $filter, $timeout, $http, rddTxService, rddTxListService, rddShortUrlService, ipCookie, $modal, $sce) {
	$scope.shorteningUrl = false;
	$scope.totalStaked = 0;
	$scope.lastStaked = 0;
	$scope.audioActive = ipCookie($scope.wallet + '_audio');

	$scope.isStakeTransaction = function(tx) {
		return (tx.isCoinStake && !isNaN(parseFloat(tx.fees)));
	}

	$scope.isStakeTransactionFilter = function() {
		return $scope.isStakeTransaction;
	}

	$scope.showStakeNotification = function(wallet, stake) {
		 notify.createNotification(wallet, {
			body: "New stake reward: Ɍ" + $filter('humanize')(stake, 8, '.', ','),
			icon: "icon.png"
		});

		 if($scope.audioActive && $scope.$parent.audioScripLoaded) {
		 	if($scope.$parent.lastSpeak) {
		 		meSpeak.stop($scope.$parent.lastSpeak);
		 	}
		 	$scope.$parent.lastSpeak = meSpeak.speak('New stake reward: ' + stake + ' reddcoins', { amplitude: 100, pitch: 40, speed: 150, wordgap: 1, variant: 'klatt' });
		 }
	}

	$scope.removeWallet = function() {
		var index = $scope.$parent.wallets.indexOf($scope.wallet);
		$scope.$parent.wallets.splice(index, 1);
		socket.removeAllListeners($scope.wallet);
		ipCookie('wallets', $scope.$parent.wallets, { expires: 10000 });
	}

	$scope.toggleAudio = function() {
		if(!$scope.audioActive) {
			ipCookie($scope.wallet + '_audio', true, { expires: 10000 });
			$scope.audioActive = true;
			if(!$scope.$parent.audioScripLoaded) {
				$.cachedScript( "js/vendor/mespeak.js" ).done(function( script, textStatus ) {
					meSpeak.loadConfig("js/vendor/mespeak_config.json");
					meSpeak.loadVoice("js/vendor/voices/en/en.json");
					if($scope.$parent.lastSpeak) {
				 		meSpeak.stop($scope.$parent.lastSpeak);
				 	}
					$scope.$parent.lastSpeak = meSpeak.speak('You have enabled audio notifications for this address', { amplitude: 100, pitch: 40, speed: 150, wordgap: 1, variant: 'klatt' });
					$scope.$parent.audioScripLoaded = true;
				});
			} else {
				if($scope.$parent.lastSpeak) {
			 		meSpeak.stop($scope.$parent.lastSpeak);
			 	}
				$scope.$parent.lastSpeak = meSpeak.speak('You have enabled audio notifications for this address', { amplitude: 100, pitch: 40, speed: 150, wordgap: 1, variant: 'klatt' });
			}
		} else {
			ipCookie($scope.wallet + '_audio', false, { expires: 10000 });
			if($scope.$parent.lastSpeak) {
		 		meSpeak.stop($scope.$parent.lastSpeak);
		 	}
			$scope.$parent.lastSpeak = meSpeak.speak('You have disabled audio notifications for this address', { amplitude: 100, pitch: 40, speed: 150, wordgap: 1, variant: 'klatt' });
			$scope.audioActive = false;
		}
	}

	$scope.watchWallet = function($scope) {
		// reddsight sock.io
		socket.emit('subscribe', $scope.wallet);
		socket.on($scope.wallet, function(data) {
			rddTxService.getTransactionData(data).then(function(result) {
				// wait for about 4 confirmations (4 min) than update wallet
				window.setTimeout(function() { $scope.updateWallet($scope); }, 240000);
				var tx = result.data;
				$scope.transactions.push(tx);
				if($scope.isStakeTransaction(tx)) {
					var stakeValue = (tx.fees * -1);
					var notifyLevel = notify.permissionLevel();
					if(notifyLevel = notify.PERMISSION_DEFAULT) {
						notify.requestPermission(function() {
							if(notify.permissionLevel() == notify.PERMISSION_GRANTED) {
								$scope.showStakeNotification($scope.wallet, stakeValue);
							}
						});
					} else if(notifyLevel == notify.PERMISSION_GRANTED) {
						$scope.showStakeNotification($scope.wallet, stakeValue);
					}
				} else {
					if(!$scope.newTransactions) {
						$scope.newTransactions = 1;
					} else {
						$scope.newTransactions += 1;
					}
				}
			});
		});
	}

	$scope.lastUpdate;

	$scope.updateWallet = function($scope) {
		if($scope.updatePromise) {
			$timeout.cancel($scope.updatePromise);
		}
		$scope.updatePromise = $timeout(function() {
			if($scope.lastUpdate && ((new Date()) - $scope.lastUpdate) < 10000) {
				// limit manual updates to 10sec
				return;
			}

			$scope.lastUpdate = new Date();


			var balanceUrl = "http://live.reddcoin.com/api/addr/" + $scope.wallet + "/balance";

			$http({
			  url: balanceUrl
			}).success(function(data, status, headers, config) {
			  $scope.balance = data / 100000000;
			  rddTxListService.getTransactionData($scope.wallet).then(function(result) {
				$scope.transactions = result.data.txs;
				if($scope.transactions && $scope.transactions.length > 0) {
					$scope.lastTime = 0;
					var lastStake = 0;
					var oldestTime = 0;
					$scope.totalStaked = 0;
					$.each($scope.transactions, function(index, item) {
						if($scope.isStakeTransaction(item) && item.confirmations > 0) {
							if(item.time > $scope.lastTime) {
								$scope.lastTime = item.time;
								lastStake = (item.fees * -1);
							}
							if(item.time * 1000 < $scope.lastStaked || $scope.lastStaked == 0) {
								$scope.lastStaked = (item.time * 1000);
							}
							$scope.totalStaked += (item.fees * -1);
						}
					});
					$scope.totalStakeTime = ($scope.lastStaked && $scope.lastStaked != Number.POSITIVE_INFINITY)?' <td><strong>Total (last <timer start-time="'+$scope.lastStaked+'" interval="1000"><span ng-show="days">{{days}}d </span><span ng-show="hhours">{{hhours}}h </span><span ng-show="mminutes">{{mminutes}}m </span><span>{{sseconds}}s</span></timer>)</strong></td><td><strong>Ɍ{{totalStaked | humanize:8:\'.\':\',\'}}</strong></td><td><strong>฿{{totalStaked* $parent.$parent.rddPrice | humanize:8:\'.\':\',\'}}</strong></td><td><strong>${{totalStaked * $parent.$parent.rddDollarPrice | humanize:8:\'.\':\',\'}}</strong></td><td><strong>&gt; 0</strong></td>':0;
					$scope.intervalFunction = function(){
						$timeout(function() {
							$scope.lastRewardSeconds = (new Date()) - new Date($scope.lastTime * 1000);
							$scope.avgPercentage = ($scope.lastTime && $scope.lastTime != Number.POSITIVE_INFINITY)?'<span ng-hide="percentage > 1000">{{(percentage = (lastRewardSeconds / (seconds * 1000)) * 100) | humanize:0:\'.\':\',\'}}% of estimate</span><span class="label label-danger" ng-show="percentage > 1000"><span class="glyphicon glyphicon-off" aria-hidden="true"></span> Wallet seems to be offline</span>':0;
							$scope.intervalFunction();
						}, 1000);
					};
					$scope.intervalFunction();
					$scope.lastReward = ($scope.lastTime && $scope.lastTime != Number.POSITIVE_INFINITY)?'<timer start-time="'+($scope.lastTime*1000)+'" interval="1000"><span ng-show="days">{{days}} day{{daysS}}, </span><span ng-show="hours">{{hours}} hour{{hoursS}}, </span><span ng-show="minutes">{{minutes}} minute{{minutesS}} and </span><span>{{seconds}} second{{secondsS}}</span> ago</timer>':0;
				}
			  });
			  var transactionUrl = "http://live.reddcoin.com/api/addr/"+ $scope.wallet + "/utxo?noCache=1";
				$http({
				  url: transactionUrl
				}).success(function(data, status, headers, config) {
					data.sort(function(a, b){
					    return new Date(a.ts * 1000) - new Date(b.ts * 1000);
					});
					if($scope.unspendTransactions && $scope.unspendTransactions.length != data.length) {
						var lastTx;
						$.each(data, function(index, item) {
							if(new Date(item.ts * 1000) > new Date($scope.unspendTransactions[$scope.unspendTransactions.length - 1].ts * 1000)) {
								if(item.txid != lastTx) {
									lastTx = item.txid;
									rddTxService.getTransactionData(item.txid).then(function(result) {
										var tx = result.data;
										if(tx.confirmations > 0) {
											if($scope.isStakeTransaction(tx)) {
												var stakeValue = (tx.fees * -1);
												var notifyLevel = notify.permissionLevel();
												if(notifyLevel = notify.PERMISSION_DEFAULT) {
													notify.requestPermission(function() {
														if(notify.permissionLevel() == notify.PERMISSION_GRANTED) {
															$scope.showStakeNotification($scope.wallet, stakeValue);
														}
													});
												} else if(notifyLevel == notify.PERMISSION_GRANTED) {
													$scope.showStakeNotification($scope.wallet, stakeValue);
												}
											} else {
												if(!$scope.newTransactions) {
													$scope.newTransactions = 1;
												} else {
													$scope.newTransactions += 1;
												}
											}
										}
									});
								}
							}
						});
					}
					$scope.unspendTransactions = data;

					$scope.$parent.$watch('networkWeight', function(newValue, oldValue) {
					  $scope.updateStakeInfo($scope);
					});

					if(!$scope.latestDiff) {
					  	$http({
						  url: "http://live.reddcoin.com/api/status?q=getDifficulty"
						}).success(function(data, status, headers, config) {
							$scope.latestDiff = data['difficulty'];
							$scope.networkWeight = Math.round($scope.latestDiff * 4294967296 / 60);
						}).error(function(data, status, headers, config) {
							console.log("error", data);
						});
					} else {
						$scope.latestDiff = $scope.latestDiffUpdate;
						$scope.networkWeight = $scope.networkWeightUpdate;
					}
				}).error(function(data, status, headers, config) {
					console.log("error", data);
				});
			}).error(function(data, status, headers, config) {
				console.log("error", data);
			});
		}, 1000);
	}

	$scope.$on('timer-stopped', function (event, data){
		if(data.seconds == 0 && event.targetScope.countdownattr == $scope.countdown) {
			$scope.updateWallet($scope);
		}
	});

	$scope.updateStakeInfo = function($scope) {
		$scope.totalcoinweight = 0;
		var weight = 0;
		$.each($scope.unspendTransactions, function(key, item) {
			nowtime = Math.round(new Date().getTime()/1000.0);
			var ts =  nowtime - item.ts - 28800;
			var tstodays = ts/60/60/24;
			var coinage = 0;
			if (tstodays <= 7)
			{
				weight = -0.00408163 * Math.pow(tstodays, 3) + 0.05714286 * Math.pow(tstodays, 2) + tstodays;
			}
			else
			{
				weight = 8.4 * Math.log(tstodays) - 7.94564525;
			}
			if (item.confirmations >= 0) {
				coinage = weight * item.amount;
			}
			if (coinage >= 0)
			{
				$scope.totalcoinweight += coinage ;
			}
		});

		$scope.seconds = Math.round(($scope.$parent.networkWeight / $scope.totalcoinweight) * 60).toFixed(0);
		$scope.countdown = Math.min($scope.seconds, 60 * 30); // limit refresh to 30 minutes
		$scope.avgStakeTimespan = ($scope.seconds && $scope.seconds != Number.POSITIVE_INFINITY)?'<timer interval="1000" start-time="'+((new Date().getTime() - ($scope.seconds * 1000)))+'" end-time="'+((new Date().getTime() - ($scope.seconds * 1000)))+'" autostart="false"><span ng-show="days">{{days}} day{{daysS}}, </span><span ng-show="hours">{{hours}} hour{{hoursS}}, </span><span ng-show="minutes">{{minutes}} minute{{minutesS}} and </span><span>{{seconds}} second{{secondsS}}</span></timer>':0;
		$scope.estStakeTimespan = ($scope.seconds && $scope.seconds != Number.POSITIVE_INFINITY)?'<timer countdown="'+$scope.countdown+'" interval="1000"><div class="progress active"> <div class="progress-bar progress-bar-info" ng-style="{\'width\': ((countdown/$parent.countdown) * 100) + \'%\'}"><span>&nbsp;&nbsp;</span><span ng-show="days">{{days}} day{{daysS}}, </span><span ng-show="hours">{{hours}} hour{{hoursS}}, </span><span ng-show="minutes">{{minutes}} minute{{minutesS}} and </span><span>{{seconds}} second{{secondsS}}</span></div> </div></timer>':'not staking because the address doesn\'t have mature coins';
		$scope.estStake = (Math.round($scope.$parent.networkWeight / $scope.totalcoinweight) /60).toFixed(2);
		$scope.estStakeInDays = ($scope.estStake / 24).toFixed(2);
		$scope.$broadcast('timer-start');
	}

	$scope.openShareLayer = function (size) {
		var url = 'http://reddcoin.rocks/#' + $scope.wallet;

		if(!$scope.shortLink) {
			$scope.shorteningUrl = true;
			rddShortUrlService.getShortUrl(url).then(function(result) {
				$scope.shortLink = result.data.shorturl;
				$scope.shorteningUrl = false;
				$scope.openShareLayerInternal(size);
			}, function(error) {
				$scope.shortLink = url;
				$scope.shorteningUrl = false;
				$scope.openShareLayerInternal(size);
			});
		} else {
			$scope.openShareLayerInternal(size);
		}
	};

	$scope.openShareLayerInternal = function (size) {
		var modalInstance = $modal.open({
		  templateUrl: 'sharelayer.html',
		  controller: 'shareLayer',
		  size: size,
		  resolve: {
			shortLink: function () {
			  return $scope.shortLink;
			},
			wallet: function () {
			  return $scope.wallet;
			}
		  }
		});
	}

	if($scope.wallet && $scope.wallet.length == 34) {
		$scope.updateWallet($scope);

		$scope.watchWallet($scope);

		if($scope.audioActive && !$scope.$parent.audioScripLoaded) {
			$.cachedScript( "js/vendor/mespeak.js" ).done(function( script, textStatus ) {
				meSpeak.loadConfig("js/vendor/mespeak_config.json");
				meSpeak.loadVoice("js/vendor/voices/en/en.json");
				$scope.$parent.audioScripLoaded = true;
			});
		}
	}
}]);

reddcoinRocks.controller('shareLayer', ['$scope', '$modalInstance', 'shortLink', 'wallet', function ($scope, $modalInstance, shortLink, wallet) {
  $scope.shortLink = shortLink;
  $scope.wallet = wallet;

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}]);

reddcoinRocks.controller('stakingInfo', ['$scope', '$http', 'btcPriceService', 'rddPriceService', '$pusher', 'ipCookie', '$activityIndicator', function ($scope, $http, btcPriceService, rddPriceService, $pusher, ipCookie, $activityIndicator) {
	$scope.btcPriceUp = true;
	$scope.rddPriceUp = true;
	$scope.rddDollarPriceUp = true;
	$scope.audioScripLoaded = false;
	var audio = document.createElement("audio");
	$scope.canPlayAudioNotifications = (typeof audio.canPlayType === "function" && audio.canPlayType("audio/x-wav") !== "");
	if(window.location.hash && window.location.hash.length == 36) {
		$scope.address = window.location.hash.substring(2);
	}
	$scope.wallets = ((!!$scope.address)?[$scope.address]:ipCookie('wallets')) || [];

	if($scope.wallets.length > 0) {
		$activityIndicator.startAnimating();
	}

	$http({
	  url: "http://live.reddcoin.com/api/status?q=getDifficulty"
	}).success(function(data, status, headers, config) {
		$scope.latestDiff = data['difficulty'];
		$scope.networkWeight = Math.round($scope.latestDiff * 4294967296 / 60);
		$activityIndicator.stopAnimating();
	}).error(function(data, status, headers, config) {
		console.log("error", data);
	});

	socket.on('connect', function() {
	  // Join the room.
	  socket.emit('subscribe', 'inv');
	})
	socket.on('block', function(data) {
	  $http({
		  url: "http://live.reddcoin.com/api/status?q=getDifficulty"
		}).success(function(data, status, headers, config) {
			$scope.latestDiffUpdate = data['difficulty'];
			$scope.networkWeightUpdate = Math.round($scope.latestDiffUpdate * 4294967296 / 60);
		}).error(function(data, status, headers, config) {
			console.log("error", data);
		});
	})

	$scope.updateRddDollarPrice = function(btcPrice, rddPrice) {
		if(!btcPrice && !rddPrice) {
			return;
		}
		var newPrice = (rddPrice * btcPrice).toFixed(8);
		if(newPrice > $scope.rddDollarPrice) {
			$scope.rddDollarPriceUp = true;
		}
		if(newPrice < $scope.rddDollarPrice) {
			$scope.rddDollarPriceUp = false;
		}
		$scope.rddDollarPrice = newPrice;
	}

	var cryptsyClient = new Pusher('cb65d0a7a72cd94adf1f');
	var cryptsyPusher = $pusher(cryptsyClient);

	var bitstampClient = new Pusher('de504dc5763aeef9ff52');
	var bitstampPusher = $pusher(bitstampClient);

	btcPriceService.getPrice().then(function(result) {
		if (result.data.bitstamp && result.data.bitstamp.rates.last) {
			$scope.btcPrice = result.data.bitstamp.rates.last;
			$scope.updateRddDollarPrice($scope.btcPrice, $scope.rddPrice);
		}
	});

	bitstampPusher.subscribe('live_trades').bind('trade', function (data) {
		if(data.price > $scope.btcPrice) {
			$scope.btcPriceUp = true;
		}
		if(data.price < $scope.btcPrice) {
			$scope.btcPriceUp = false;
		}
		$scope.btcPrice = data.price;
		$scope.updateRddDollarPrice($scope.btcPrice, $scope.rddPrice);
	});

	rddPriceService.getPrice().then(function(result) {
		if (result.data.query.results && result.data.query.results.json.success == "true" && result.data.query.results.json['result']['Last']) {
			$scope.rddPrice = result.data.query.results.json['result']['Last'];
			$scope.updateRddDollarPrice($scope.btcPrice, $scope.rddPrice);
		}
	});

	cryptsyPusher.subscribe('trade.169').bind('message', function (data) {
		if(data.trade.price > $scope.rddPrice) {
			$scope.rddPriceUp = true;
		}
		if(data.trade.price < $scope.rddPrice) {
			$scope.rddPriceUp = false;
		}
		$scope.rddPrice = data.trade.price;
		$scope.updateRddDollarPrice($scope.btcPrice, $scope.rddPrice);
	});

	$scope.getBalance = function() {
		if($scope.wallet && $scope.wallet.length == 34 && $.inArray($scope.wallet, $scope.wallets)) {
			$scope.wallets.push($scope.wallet);
			$scope.wallet = '';
			ipCookie('wallets', $scope.wallets, { expires: 10000 });
		}
	};
}]);
