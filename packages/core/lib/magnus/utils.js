"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isFieldNode(obj) {
    return obj.kind === "Field";
}
exports.isFieldNode = isFieldNode;
function isFragmentSpreadNode(obj) {
    return obj.kind === "FragmentSpread";
}
exports.isFragmentSpreadNode = isFragmentSpreadNode;
function isInlineFragmentNode(obj) {
    return obj.kind === "InlineFragment";
}
exports.isInlineFragmentNode = isInlineFragmentNode;
function isVariableNode(obj) {
    return obj.kind === "Variable";
}
exports.isVariableNode = isVariableNode;
function isIntValueNode(obj) {
    return obj.kind === "IntValue";
}
exports.isIntValueNode = isIntValueNode;
function isFloatValueNode(obj) {
    return obj.kind === "FloatValue";
}
exports.isFloatValueNode = isFloatValueNode;
function isStringValueNode(obj) {
    return obj.kind === "StringValue";
}
exports.isStringValueNode = isStringValueNode;
function isBooleanValueNode(obj) {
    return obj.kind === "BooleanValue";
}
exports.isBooleanValueNode = isBooleanValueNode;
function isNullValueNode(obj) {
    return obj.kind === "NullValue";
}
exports.isNullValueNode = isNullValueNode;
function isEnumValueNode(obj) {
    return obj.kind === "EnumValue";
}
exports.isEnumValueNode = isEnumValueNode;
function isListValueNode(obj) {
    return obj.kind === "ListValue";
}
exports.isListValueNode = isListValueNode;
function isObjectValueNode(obj) {
    return obj.kind === "ObjectValue";
}
exports.isObjectValueNode = isObjectValueNode;
//# sourceMappingURL=utils.js.map