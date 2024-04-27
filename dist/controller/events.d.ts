import { FrameControl } from "../zcl";
import { Device, Endpoint } from "./model";
import { KeyValue } from "./tstype";
declare enum Events {
    message = "message",
    adapterDisconnected = "adapterDisconnected",
    deviceJoined = "deviceJoined",
    deviceInterview = "deviceInterview",
    deviceAnnounce = "deviceAnnounce",
    deviceNetworkAddressChanged = "deviceNetworkAddressChanged",
    deviceLeave = "deviceLeave",
    permitJoinChanged = "permitJoinChanged",
    lastSeenChanged = "lastSeenChanged"
}
interface DeviceJoinedPayload {
    device: Device;
}
interface DeviceInterviewPayload {
    status: 'started' | 'successful' | 'failed';
    device: Device;
}
interface DeviceNetworkAddressChangedPayload {
    device: Device;
}
interface DeviceAnnouncePayload {
    device: Device;
}
interface DeviceLeavePayload {
    ieeeAddr: string;
}
interface PermitJoinChangedPayload {
    permitted: boolean;
    reason: 'timer_expired' | 'manual';
    timeout: number;
}
interface LastSeenChangedPayload {
    device: Device;
    reason: 'deviceAnnounce' | 'networkAddress' | 'deviceJoined' | 'messageEmitted' | 'messageNonEmitted';
}
declare const CommandsLookup: {
    [s: string]: MessagePayloadType;
};
type MessagePayloadType = 'attributeReport' | 'readResponse' | 'raw' | 'read' | 'write' | 'commandOn' | 'commandOffWithEffect' | 'commandStep' | 'commandStop' | 'commandHueNotification' | 'commandOff' | 'commandStepColorTemp' | 'commandMoveWithOnOff' | 'commandMove' | 'commandMoveHue' | 'commandStepHue' | 'commandStepSaturation' | 'commandMoveToSaturation' | 'commandStopWithOnOff' | 'commandMoveToLevelWithOnOff' | 'commandToggle' | 'commandTradfriArrowSingle' | 'commandTradfriArrowHold' | 'commandTradfriArrowRelease' | 'commandStepWithOnOff' | 'commandMoveToColorTemp' | 'commandMoveToColor' | 'commandOnWithTimedOff' | 'commandRecall' | 'commandArm' | 'commandPanic' | 'commandEmergency' | 'commandColorLoopSet' | 'commandOperationEventNotification' | 'commandStatusChangeNotification' | 'commandEnhancedMoveToHueAndSaturation' | 'commandUpOpen' | 'commandDownClose' | 'commandMoveToLevel' | 'commandMoveColorTemp' | 'commandDataResponse' | 'commandDataReport' | 'commandGetWeeklyScheduleRsp' | 'commandQueryNextImageRequest' | 'commandNotification' | 'commandAlertsNotification' | 'commandProgrammingEventNotification' | 'commandGetPinCodeRsp' | 'commandArrivalSensorNotify' | 'commandCommissioningNotification' | 'commandGetUserStatusRsp' | 'commandAlarm' | 'commandUnlockDoorRsp' | 'commandMcuVersionResponse' | 'commandAtHome' | 'commandGoOut' | 'commandCinema' | 'commandRepast' | 'commandSleep' | 'commandStudyKeyRsp' | 'commandCreateIdRsp' | 'commandGetIdAndKeyCodeListRsp' | 'commandMcuSyncTime' | 'commandGetPanelStatus' | 'commandCheckIn' | 'commandActiveStatusReport' | 'commandActiveStatusReportAlt' | 'commandMoveToHue' | 'commandStore' | 'commandWiserSmartSetSetpoint' | 'commandWiserSmartCalibrateValve' | 'commandSiglisZigfredButtonEvent' | 'commandDanfossSetpointCommand' | 'commandZosungSendIRCode00' | 'commandZosungSendIRCode01' | 'commandZosungSendIRCode02' | 'commandZosungSendIRCode04' | 'zosungSendIRCode03Resp' | 'zosungSendIRCode05Resp' | 'commandMcuGatewayConnectionStatus' | 'commandSchneiderWiserThermostatBoost' | 'transferDataResp' | 'commandAction1' | 'commandAction2' | 'commandAction3' | 'commandAction4' | 'commandAction6' | 'commandTuyaAction' | 'commandTuyaAction2';
interface MessagePayload {
    type: MessagePayloadType;
    device: Device;
    endpoint: Endpoint;
    linkquality: number;
    groupID: number;
    cluster: string | number;
    data: KeyValue | Array<string | number>;
    meta: {
        zclTransactionSequenceNumber?: number;
        manufacturerCode?: number;
        frameControl?: FrameControl;
    };
}
export { Events, MessagePayload, MessagePayloadType, CommandsLookup, DeviceInterviewPayload, DeviceAnnouncePayload, DeviceLeavePayload, DeviceJoinedPayload, PermitJoinChangedPayload, DeviceNetworkAddressChangedPayload, LastSeenChangedPayload, };
//# sourceMappingURL=events.d.ts.map