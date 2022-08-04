import * as tf from "@tensorflow/tfjs";
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {Howl,Howler} from 'howler';
import './App.css';
import { initNotifications, notify } from '@mycv/f8-notification';

import React, { useEffect, useRef, useState, createContext, useContext} from "react";
const soundURL = require('./asset/hey_sondn.mp3');
const soundHetURL = require('./asset/het.mp3');
const soundPewURL = require('./asset/pewpew.mp3');
const soundThangLungURL = require('./asset/thanglung.mp3');
const soundLayMayURL = require('./asset/soundLayMay.mp4');
const loadURL = require('./asset/load.gif');

var sound = new Howl({
  src: [soundThangLungURL]
});
Howler.volume(1.4);
const HamContext = createContext();

const NOT_TOUCH_label = 'not_touch';
const TOUCHED_label  = 'touched';
const TRAINING_TIMES  = 50;
const TOUCHED_CONFIDENCE =  0.8;
function App() {  
  const LOAD = useRef();
 
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] =  useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [propText, setPropText] = useState("Bước 1: Quay video hành vi bình thường của bạn");
  const [propBtn, setPropBtn] = useState("Bắt đầu");
  const [setUpDone, SETSetUpDone] = useState(false);
  const [btnTrain1,setBtnTrain1] = useState(false);
  const [btnTrain2,setBtnTrain2] = useState(false);
  const [btnRun,setBtnRun] = useState(false);
  const [second,setSecond] = useState(0);
  const [minute,setMinute] = useState(0);
  const [hour,setHour] = useState(0);

   const init  = async () =>{
    console.log('init...');
    await setupCamera();

    console.log('setUp camera success');

     classifier.current = knnClassifier.create();
     mobilenetModule.current  = await mobilenet.load();
    console.log("setup done");
    console.log("Không bỏ tay lên mặt và bấm Train 1");
    setBtnTrain1(true);// set up done con (Lắp não cho AI) mới hiện bút bắt đầu
    
    // initNotifications({ cooldown: 3000 });

  }
  
  const setupCamera = () =>{
    return new Promise((resolve,reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

      if( navigator.getUserMedia){
        navigator.getUserMedia(
          {video: true},
          stream  => {
              video.current.srcObject = stream;
              video.current.addEventListener('loadeddata', resolve);
          },
          error  => reject(error)
        )
      }
      else {
        reject();
      }
    })
  }
  
  // ban dau vao nghe su kien lan dau tien
  const train  = async label  =>{
    console.log(`[${label}] Đang train cho gương mặt của bạn...`);
    setStateLoaded(true);
    
    for(let i = 0; i < TRAINING_TIMES;++i){

      console.log(`Progress ${parseInt((i+1)/ TRAINING_TIMES *100) }%`)
      if(label == NOT_TOUCH_label){
        setPropText("Giữ yên hành vi bình thường, AI Đang đọc hành vi bình thường của bạn..."+ parseInt((i+1) / TRAINING_TIMES*100)+"%");
        

      }
      else if(label  == TOUCHED_label){
        setPropText("Giữ yên hành vi xấu, AI Đang đọc hành vi xấu của bạn..."+ parseInt((i+1) / TRAINING_TIMES*100)+"%");
      }
       
      await training(label);// khi dùng await cần async
    }
    setStateLoaded(false);
    
    if(label ==TOUCHED_label ){
    
      setPropText("Đã quét xong!!!");
      setPropBtn("Khởi động");
      // Train2 chạy xong 100% mới hiện nút Khới động lên
       setBtnRun(true);

    }
    else if(label == NOT_TOUCH_label)
    {
      // Train1 chạy xong 100% mới hiện nút Tiếp tục lên

      setBtnTrain2(true);
      setPropText("Bước 2: Quay video Hành vi bạn cần cảnh báo !!!")
      setPropBtn("Tiếp tục");

      
    }
  }
  /**
   * Bước 1: Train cho máy khuôn mặt không chạm tay
   * Bước 2: train cho máy khuôn mặt có tay chạm
   * Bước 3: lấy luồng ảnh hiện tại, phân tích và so sánh với data đã học trước đó
   * ==> Nếu mà matching với data khuôn mặt có chạm tay thì cảnh báo
   * @param {*} label 
   * @returns 
   */

  const training  = (label) =>{
      
    return new Promise(async resolve =>{
      const embeddingImg =  mobilenetModule.current.infer(
        video.current,
         true
      );
      // hàm class này dùng addExample học 
      classifier.current.addExample(embeddingImg, label);
      await sleep(100);
      resolve();
    });
  }
  const run = async () =>{
    const embeddingImg =  mobilenetModule.current.infer(
      video.current,
       true
    );
    const result = await classifier.current.predictClass(embeddingImg);

    console.log('label: ', result.label);
    console.log('Confidences: ', result.confidences );
    
      if(result.label === TOUCHED_label
          &&
          result.confidences[result.label] > TOUCHED_CONFIDENCE
        )
        {
          console.log("Touched");
          // notify("BỎ TAY RA!!!", "BẠN ĐANG CHẠM TAY VÀO MẶT ");
          // kiểm tra đc phép phát mới phát, và ngay lập tức đóng cửa phát tiếp theo
          // chờ lần phát hiện tại gọi hàm Sound.on('end') ở useEffect
          if(canPlaySound.current){
            canPlaySound.current = false;
            sound.play();
          }
          
          setTouched(true);
        }
        else {
          console.log("NotTouched");
          setTouched(false);


        }

    await sleep(200);

    run();
  }

  // hàm nghỉ theo 1 khoảng tg
  const sleep =  (ms = 0) =>{
    return new Promise(resolve => setTimeout(()=>{
      resolve();

    },ms))
  }
  
  useEffect(() => {
    init();

    // hàm này Howler cho phép bắt được sự kiện hoàn thành của đài phát hiên tại
    // sau đó mới gán true cho đài phát tiếp theo đc phép phát , 

    //=> tránh chồng chéo âm thanh hỗn độn giữa mỗi lần phát âm thanh
    sound.on('end', function(){
      console.log('Finished!');
      canPlaySound.current = true;
    });
   
    //clean up
    return () => {

    }
  },[]);
  const handleTrain1 =()=>{
    train(NOT_TOUCH_label);
    setBtnTrain1(false);
  }
  const handleTrain2 =()=>{
    train(TOUCHED_label);
    setBtnTrain2(false);
    
  }
  const handleRun = () =>{
    run();
    setBtnRun(false);
    var today = new Date();

    setPropText("Máy tính đang theo dõi hành vi của bạn, Hãy thận trọng!!!");

    setInterval(()=>{
      
      setSecond(second => second+1);
      
     
    },1000)
  }
  return (
    <div className="Main">
      <img className={`load ${stateLoaded ? 'loadAppear': 'loadHidden'}`} src={loadURL}/>
        <video ref={video} className={`video ${touched ? 'touched' : ''}`}  autoPlay/>
        <div className='control'>
        <h1 className="title" style={{color:"#fff"}}>{propText}</h1>
        {
          btnTrain1 
          &&
          <button className='btn-Buoc' onClick={handleTrain1}>{propBtn}</button>
          
        }
         {
          btnTrain2
          &&
          <button className='btn-Buoc' onClick={handleTrain2}>{propBtn}</button>
          
        }
        {
          btnRun
          &&
          <button className='btn-Buoc' onClick={handleRun}>{propBtn}</button>     
          
        }
        </div>
            
        <h1 className="clock">Timing seconds:  {second}</h1>
          
        
    </div>
  );
}

export default App;
export {HamContext}

