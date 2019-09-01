import {
    SelectionNode,
    ListValueNode,
    EnumValueNode,
    NullValueNode,
    BooleanValueNode,
    StringValueNode,
    FloatValueNode,
    IntValueNode,
    ValueNode,
    VariableNode,
    FieldNode,
    FragmentSpreadNode,
    InlineFragmentNode
} from "graphql";
export function isFieldNode(obj: SelectionNode): obj is FieldNode {
    return obj.kind === "Field";
}
export function isFragmentSpreadNode(
    obj: SelectionNode
): obj is FragmentSpreadNode {
    return obj.kind === "FragmentSpread";
}
export function isInlineFragmentNode(
    obj: SelectionNode
): obj is InlineFragmentNode {
    return obj.kind === "InlineFragment";
}
export function isVariableNode(obj: ValueNode): obj is VariableNode {
    return obj.kind === "Variable";
}
export function isIntValueNode(obj: ValueNode): obj is IntValueNode {
    return obj.kind === "IntValue";
}
export function isFloatValueNode(obj: ValueNode): obj is FloatValueNode {
    return obj.kind === "FloatValue";
}
export function isStringValueNode(obj: ValueNode): obj is StringValueNode {
    return obj.kind === "StringValue";
}
export function isBooleanValueNode(obj: ValueNode): obj is BooleanValueNode {
    return obj.kind === "BooleanValue";
}
export function isNullValueNode(obj: ValueNode): obj is NullValueNode {
    return obj.kind === "NullValue";
}
export function isEnumValueNode(obj: ValueNode): obj is EnumValueNode {
    return obj.kind === "EnumValue";
}
export function isListValueNode(obj: ValueNode): obj is ListValueNode {
    return obj.kind === "ListValue";
}
export function isObjectValueNode(obj: ValueNode): obj is ListValueNode {
    return obj.kind === "ObjectValue";
}