$(document).ready(function(){
	// Carrega e configura a API de áudio
    /*Parametros: variant: variação de características da voz, 
      speed: velocidade de fala, pitch: afinação, amplitude: volume*/
    parametros_audio = {variant: 'f2', speed: 160, pitch: 60, amplitude: 100};
    var reproduzindo_audio = false;

	meSpeak.loadConfig('mespeak/mespeak_config.json');
	meSpeak.loadVoice('mespeak/voices/pt.json', function(){
        // Mensagem de inicialização
        if(!reproduzindo_audio){
            reproduzindo_audio = true;
            console.log(txt_audio.innerHTML);
            $('#icone_audio').show();
            txt_audio.innerHTML = 'Aplicativo inicializado. Toque na tela para pausar.';
            meSpeak.speak('Aplicativo inicializado. Toque na tela para pausar.', parametros_audio, callback_audio);
        }
    });

    var callback_audio = function(finalizado){
        if(finalizado){
            reproduzindo_audio = false;
            $('#icone_audio').hide();
        }

        if(!pausado)
            txt_audio.innerHTML = 'Analisando ambiente...';
        else
            txt_audio.innerHTML = 'Detecção pausada.';
            
        if(video.src == '')
            txt_audio.innerHTML = 'Acessando câmera...';
    }


    // Evento de clique na tela (pause/continue)
    pausado = false;

    $('body').click(function(){
        reproduzindo_audio = true;
        $('#icone_audio').show();
        if(!pausado){
            txt_audio.innerHTML = 'Pausado. Toque na tela para continuar.';
            meSpeak.speak('Pausado. Toque na tela para continuar.', parametros_audio, callback_audio);
            pausado = true;
        }else{
            txt_audio.innerHTML = 'Executando. Toque na tela para pausar.';
            meSpeak.speak('Executando. Toque a tela para pausar.', parametros_audio, callback_audio);
            pausado = false;
        }
    });
	

    var PRECISAO_MINIMA_DETECCAO = 7;
    
    var txt_audio = document.getElementById('txt_audio');
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    canvas.hidden = true;
    ctx = canvas.getContext( '2d' );

    var gotSources = function(sourceInfos){
        id_source = null;

        for (var i = 0; i != sourceInfos.length; ++i){
            var sourceInfo = sourceInfos[i];
            if(sourceInfo.kind != 'audio'){
                id_source = sourceInfo.id;
            }
        }

        try{
            if(id_source == null){
                var parametros = {video: true};
            } else{
                var parametros = {video: {optional: [{sourceId: id_source}]}};
            }
            compatibility.getUserMedia(parametros, function(stream){
                try{
                    video.src = compatibility.URL.createObjectURL(stream);
                }catch(error){
                    video.src = stream;
                }
                txt_audio.innerHTML = 'Analisando ambiente...';
                compatibility.requestAnimationFrame(play);

            }, function(error){
                alert('Não foi possível acessar a câmera');
            });

        }catch(error) {
            alert('Ocorreu um erro: ' + error);
        }
        
    }

    // Se houver mais de uma câmera, obtém a frontal
    if (typeof MediaStreamTrack === 'undefined'){
        gotSources([]);
    } else {
        MediaStreamTrack.getSources(gotSources);
    }                
    
    
    play = function(){
        compatibility.requestAnimationFrame(play);
        
        if (video.paused){
            video.play();
        }
        
        if(video.readyState === video.HAVE_ENOUGH_DATA){
            canvas.hidden = true;
            video.hidden = false;
                        
            // Divide a tela em três partes
            tam_parte_tela = video.videoWidth / 3;
            if(!pausado && !reproduzindo_audio){
                $(video).objectdetect('all', {classifier: objectdetect.frontalface}, function(coords){
                    
                    if(coords.length){
                    
                        detectados = {'esq': 0, 'meio': 0, 'dir': 0};
                        var achou = false;
                        
                        for(i in coords){
                        
                            if(coords[i][4] < PRECISAO_MINIMA_DETECCAO){
                                continue;
                            }
                            
                            achou = true;
                            
                            var rosto = coords[i];

                            // Posição do rosto na tela
                            if(rosto[0] + (rosto[2] / 2) >= tam_parte_tela * 2){
                                detectados['dir'] += 1;
                            } else if(rosto[0] + (rosto[2] / 2) >= tam_parte_tela){
                                detectados['meio'] += 1;
                            } else{
                                detectados['esq'] += 1;
                            }
                            
                            //console.log(' - Rosto ' + i + ' ' + rosto[4] + '%');                                    
                            
                            video.hidden = true;
                            canvas.hidden = false;
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0);
                            
                            ctx.strokeStyle = 'rgba(255,0,0,1)';
                            ctx.lineWidth = '4';
                            ctx.strokeRect(rosto[0], rosto[1], rosto[2], rosto[3]);

                        }
                        
                        if(achou){
                            var msg = '';
                        
                            if(detectados['esq']){
                                msg += detectados['esq'] + ' pessoa' + (detectados['esq'] == 1 ? '' : 's') + ' à esquerda';
                            }
                            
                            if(detectados['meio']){
                                if(msg.length)
                                    msg += ' e ';
                                msg += detectados['meio'] + ' pessoa' + (detectados['meio'] == 1 ? '' : 's') + ' à frente';
                            }
                            
                            if(detectados['dir']){
                                if(msg.length)
                                    msg += ' e ';
                                msg += detectados['dir'] + ' pessoa' + (detectados['dir'] == 1 ? '' : 's') + ' à direita';
                            }
                            
                            $('#icone_audio').show();
                            txt_audio.innerHTML = msg + '.';

							// Reproduz o aúdio
							if(!reproduzindo_audio){
								reproduzindo_audio = true;
                                meSpeak.speak(msg, parametros_audio, callback_audio);
							}
                        }
                    }
                });
            }
        }
    }                
});
