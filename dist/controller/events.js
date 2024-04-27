"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandsLookup = exports.Events = void 0;
var Events;
(function (Events) {
    Events["message"] = "message";
    Events["adapterDisconnected"] = "adapterDisconnected";
    Events["deviceJoined"] = "deviceJoined";
    Events["deviceInterview"] = "deviceInterview";
    Events["deviceAnnounce"] = "deviceAnnounce";
    Events["deviceNetworkAddressChanged"] = "deviceNetworkAddressChanged";
    Events["deviceLeave"] = "deviceLeave";
    Events["permitJoinChanged"] = "permitJoinChanged";
    Events["lastSeenChanged"] = "lastSeenChanged";
})(Events || (exports.Events = Events = {}));
const CommandsLookup = {
    'notification': 'commandNotification',
    'commissioningNotification': 'commandCommissioningNotification',
    'on': 'commandOn',
    'offWithEffect': 'commandOffWithEffect',
    'step': 'commandStep',
    'stop': 'commandStop',
    'hueNotification': 'commandHueNotification',
    'off': 'commandOff',
    'stepColorTemp': 'commandStepColorTemp',
    'stepHue': 'commandStepHue',
    'stepSaturation': 'commandStepSaturation',
    'moveWithOnOff': 'commandMoveWithOnOff',
    'move': 'commandMove',
    'moveColorTemp': 'commandMoveColorTemp',
    'moveHue': 'commandMoveHue',
    'moveToSaturation': 'commandMoveToSaturation',
    'stopWithOnOff': 'commandStopWithOnOff',
    'moveToLevel': 'commandMoveToLevel',
    'moveToLevelWithOnOff': 'commandMoveToLevelWithOnOff',
    'toggle': 'commandToggle',
    'tradfriArrowSingle': 'commandTradfriArrowSingle',
    'tradfriArrowHold': 'commandTradfriArrowHold',
    'tradfriArrowRelease': 'commandTradfriArrowRelease',
    'stepWithOnOff': 'commandStepWithOnOff',
    'moveToColorTemp': 'commandMoveToColorTemp',
    'moveToColor': 'commandMoveToColor',
    'onWithTimedOff': 'commandOnWithTimedOff',
    'recall': 'commandRecall',
    'arm': 'commandArm',
    'panic': 'commandPanic',
    'emergency': 'commandEmergency',
    'operationEventNotification': 'commandOperationEventNotification',
    'statusChangeNotification': 'commandStatusChangeNotification',
    'colorLoopSet': 'commandColorLoopSet',
    'enhancedMoveToHueAndSaturation': 'commandEnhancedMoveToHueAndSaturation',
    'downClose': 'commandDownClose',
    'upOpen': 'commandUpOpen',
    'dataResponse': 'commandDataResponse',
    'dataReport': 'commandDataReport',
    'mcuVersionResponse': 'commandMcuVersionResponse',
    'getWeeklyScheduleRsp': 'commandGetWeeklyScheduleRsp',
    'queryNextImageRequest': 'commandQueryNextImageRequest',
    'alertsNotification': 'commandAlertsNotification',
    'programmingEventNotification': 'commandProgrammingEventNotification',
    'getPinCodeRsp': 'commandGetPinCodeRsp',
    'getUserStatusRsp': 'commandGetUserStatusRsp',
    'arrivalSensorNotify': 'commandArrivalSensorNotify',
    'getPanelStatus': 'commandGetPanelStatus',
    'checkin': 'commandCheckIn',
    'moveToHue': 'commandMoveToHue',
    'store': 'commandStore',
    'alarm': 'commandAlarm',
    'unlockDoorRsp': 'commandUnlockDoorRsp',
    // HEIMAN scenes cluster
    'atHome': 'commandAtHome',
    'goOut': 'commandGoOut',
    'cinema': 'commandCinema',
    'repast': 'commandRepast',
    'sleep': 'commandSleep',
    // HEIMAN IR remote cluster
    'studyKeyRsp': 'commandStudyKeyRsp',
    'createIdRsp': 'commandCreateIdRsp',
    'getIdAndKeyCodeListRsp': 'commandGetIdAndKeyCodeListRsp',
    'mcuGatewayConnectionStatus': 'commandMcuGatewayConnectionStatus', // Tuya gateway connnection status
    'mcuSyncTime': 'commandMcuSyncTime', // Tuya time sync
    'activeStatusReport': 'commandActiveStatusReport', // Tuya active status report (command 0x06)
    'activeStatusReportAlt': 'commandActiveStatusReportAlt', // Tuya active status report (command 0x05)
    // Wiser Smart HVAC Commmands
    'wiserSmartSetSetpoint': 'commandWiserSmartSetSetpoint',
    'wiserSmartCalibrateValve': 'commandWiserSmartCalibrateValve',
    // Dafoss Ally/Hive TRV Commands
    'danfossSetpointCommand': 'commandDanfossSetpointCommand',
    // Siglis zigfred Commands
    'siglisZigfredButtonEvent': 'commandSiglisZigfredButtonEvent',
    // Zosung IR remote cluster commands and responses
    'zosungSendIRCode01': 'commandZosungSendIRCode01',
    'zosungSendIRCode02': 'commandZosungSendIRCode02',
    'zosungSendIRCode04': 'commandZosungSendIRCode04',
    'zosungSendIRCode00': 'commandZosungSendIRCode00',
    'zosungSendIRCode03Resp': 'zosungSendIRCode03Resp',
    'zosungSendIRCode05Resp': 'zosungSendIRCode05Resp',
    'transferDataResp': 'transferDataResp',
    // Schneider
    'schneiderWiserThermostatBoost': 'commandSchneiderWiserThermostatBoost',
    // Tradfri
    'action1': 'commandAction1',
    'action2': 'commandAction2',
    'action3': 'commandAction3',
    'action4': 'commandAction4',
    'action6': 'commandAction6',
    // Tuya
    'tuyaAction': 'commandTuyaAction',
    'tuyaAction2': 'commandTuyaAction2',
};
exports.CommandsLookup = CommandsLookup;
//# sourceMappingURL=events.js.map