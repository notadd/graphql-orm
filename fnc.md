function createArrayCall(
    item: any[],
    parent: any,
    path: string,
    action: SelectionSet
) {
    if (item && item.length > 0)
        return item.map((it, index) => {
            if (Array.isArray(it) && it.length > 0) {
                return createArrayCall(it, item, path, action);
            } else if (typeof it === "function") {
                return createFunc(it, item, path, action);
            } else if (it) {
                return createCall(it, item, path, action);
            }
        })
    return item;
}
function createCall(
    item: any,
    parent: any,
    path: string,
    action: SelectionSet
) {
    if (item) {
        const actionPaths = action
            .getPath()
            .join(".")
            .replace(`${path}.`, ``)
            .split(".")
            .reverse();
        const actionPath = actionPaths.pop();
        if (actionPath) {
            const it = item[actionPath];
            if (Array.isArray(it) && it.length > 0) {
                item[actionPath] = createArrayCall(
                    it,
                    item,
                    `${path}.${actionPath}`,
                    action
                );
            } else if (typeof it === "function") {
                item[actionPath] = createFunc(
                    it,
                    item,
                    `${path}.${actionPath}`,
                    action
                );
            } else if (it) {
                item[actionPath] = createCall(
                    it,
                    item,
                    `${path}.${actionPath}`,
                    action
                );
            }
        }
        return item;
    }
    return item;
}
function createFunc(
    item: any,
    parent: any,
    path: string,
    action: SelectionSet
) {
    if (item) {
        const args = action.getArguments();
        return async () => await item.bind(parent)(...args);
    }
    return item;
}
/**
 * 创建并修改
 */
function callFn(item: any, set: SelectionSet) {
    const actions = set.getActions();
    const path = set.getPath().join(".");
    if (actions) {
        actions.map(action => {
            if (Array.isArray(item) && item.length > 0) {
                createArrayCall(item, item, path, action);
            } else if (typeof item === "function") {
                createFunc(item, item, path, action);
            } else if (item) {
                createCall(item, item, path, action);
            }
        });
    }
    return item;
}