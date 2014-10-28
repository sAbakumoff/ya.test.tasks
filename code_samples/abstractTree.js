var AbstractTreeMapBehavior = function (mapViewModel, configuration) {
	this.configuration = configuration;
	this.defaultNodeSize = { width: 70, height: 35 };
	this.mapViewModel = mapViewModel;
	this.nodes = this.mapViewModel.nodes;
	var self = this;
	if (this.mapViewModel.isEmpty()) {
		this.treeRoot = new TreeNodeViewModel();
		this.treeRoot.location({ x: -this.defaultNodeSize.width / 2, y: -this.defaultNodeSize.height });
		this.treeRoot.size(this.defaultNodeSize);
		this.treeRoot.order = 1;
		this.treeRoot.movable = false;
		this.treeRoot.isRoot = true;
		this.treeRoot.properties.Text.property('Topic');
		this.treeRoot.setParentMap(this.mapViewModel);
		if(this.configuration && isFunction(this.configuration.configureRootNode)) {
			this.configuration.configureRootNode(this.treeRoot);
		}
		this.nodes.push(this.treeRoot);
	} else {
		this.nodes().forEach(function (node) {
			if (node.isRoot) {
				self.treeRoot = node;
				self.treeRoot.movable = false;
			}
		});
	}
	this.commands = [];
	var droppableNode = new TreeNodeViewModel();
	droppableNode.size(this.defaultNodeSize);
	droppableNode.propsBag.parentMap(this.mapViewModel);
	this.droppableItems = [droppableNode];
	this.Action = configuration.Action;
	this.dropAction = null;
};

AbstractTreeMapBehavior.prototype.isMapNode = function (node) {
	return node && node.controlType == 'treeNode';
};


AbstractTreeMapBehavior.prototype.getModifiedNodesInfo = function (modifications, newNodes, removedNodes) {
	var treeNodeSpecificProperties = ['order', 'childrenIds', 'connections', 'parentId', 'isDetail'];
	var nodesInfo = this.mapViewModel.getNodesInfo(modifications, newNodes, removedNodes, treeNodeSpecificProperties);
	var rootNode = null;
	nodesInfo.forEach(function (nodeInfo) {
		if (nodeInfo.origin.isRoot)
			rootNode = nodeInfo;
	});
	this.configuration.layout.call(this, nodesInfo, rootNode, 0, 0);
	centralizeNodes(nodesInfo, CentralizingDirection.Full);
	return nodesInfo;
};

AbstractTreeMapBehavior.prototype.updateLocation = function (nodeInfo, breadth, depth) {
	nodeInfo.x = breadth - nodeInfo.width;
	nodeInfo.y = depth - nodeInfo.height / 2;
	nodeInfo.originalLocationChanged = true;
};

AbstractTreeMapBehavior.prototype.getMaxDepth = function (nodesInfo, nodeInfo) {
	var maxDepth = nodeInfo.y + nodeInfo.height;
	var children = this.getChildrenNodeInfo(nodesInfo, nodeInfo);
	if (children && children.length === 1) {
		var singleChildInfo = children[0];
		var childrenOfChild = this.getChildrenNodeInfo(nodesInfo, singleChildInfo);
		if (childrenOfChild.length === 0)
			return singleChildInfo.y + singleChildInfo.height * 2 + 30;
	}
	var self = this;
	children.forEach(function (childInfo) {
		maxDepth = Math.max(maxDepth, self.getMaxDepth(nodesInfo, childInfo));
	});
	return maxDepth;
};

AbstractTreeMapBehavior.prototype.getMaxBreadth = function (nodesInfo, nodeInfo) {
	var maxX = nodeInfo.x + nodeInfo.width;
	var children = this.getChildrenNodeInfo(nodesInfo, nodeInfo);
	var self = this;
	children.forEach(function (childInfo) {
		maxX = Math.max(maxX, self.getMaxBreadth(nodesInfo, childInfo));
	});
	return maxX;
};


AbstractTreeMapBehavior.prototype.getChildrenNodeInfo = function (nodesInfo, nodeInfo) {
	function findNodeInfoById(id) {
		var ret = null;
		nodesInfo.forEach(function (ni) {
			if (ni.origin.id == id)
				ret = ni;
		});
		return ret;
	}
	var children = [];
	nodeInfo.childrenIds.forEach(function (childId) {
		var childInfo = findNodeInfoById(childId);
		if (childInfo)
			children.push(childInfo);
	});
	return children.sort(function (info1, info2) { return info1.order - info2.order; });
};

AbstractTreeMapBehavior.prototype.onDragOver = function (mapPoint, draggedNode) {
	return this.configuration.onDragOver.call(this, mapPoint, draggedNode);
};

AbstractTreeMapBehavior.prototype.getNewChildOrder = function(child, parent) {
	var nodeOrder = 1;
	var children = this.getChildren(parent, [child.id]);
	var oldLastChild = children && children.length ? children[children.length - 1] : null;
	if (oldLastChild) {
		nodeOrder = oldLastChild.order + 1;
	}
	return nodeOrder;
};

AbstractTreeMapBehavior.prototype.onDrop = function (droppedItem, serviceProvider, fallback) {
	return this.configuration.onDrop.call(this, droppedItem, serviceProvider, fallback);
};

AbstractTreeMapBehavior.prototype.onRemove = function (nodesToRemove) {
	var removingModifications = this.getModificationsForNodeRemoving(nodesToRemove);
	this.mapViewModel.addRemoveNodes([], nodesToRemove, removingModifications);
};


AbstractTreeMapBehavior.prototype.getModificationsForNodeRemoving = function (nodes) {
	var self = this;
	var modificationsList = [];
	// first pass remove the refs to the removed nodes from their parents children lists
	var removedNodesIds = [];
	nodes.forEach(function (node) {
		if (self.isMapNode(node)) {
			var parent = self.getParent(node);
			buildRemovingChildModification(node, parent, modificationsList);
			removedNodesIds.push(node.id);
		}
	});
	// next pass we re-organize the children nodes of the removed nodes
	nodes.forEach(function (node) {
		if (self.isMapNode(node)) {
			var parent = self.getParent(node);
			var parentProperties = getModifiedProperties(parent, modificationsList);
			if (!parentProperties.childrenIds)
				parentProperties = parent;
			var newChildren = self.getChildren(node, removedNodesIds);
			var oldChildren = self.getChildren(parentProperties, [node.id]);
			var orderToInsert = node.order;
			newChildren.forEach(function (newChild) {
				self.configuration.buildParentChildConnectionModifications(newChild, parent, modificationsList);
				buildPropertyModification(newChild, 'order', orderToInsert, modificationsList);
				orderToInsert++;
			});
			oldChildren.forEach(function (oldChild) {
				if (oldChild.order > node.order) {
					var newOrder = oldChild.order + newChildren.length - 1;
					buildPropertyModification(oldChild, 'order', newOrder, modificationsList);
				}
			});
		}
	});
	if(this.configuration && isFunction(this.configuration.handleModifications))
		this.configuration.handleModifications.call(this, modificationsList);	
	return modificationsList;
};


AbstractTreeMapBehavior.prototype.getChildren = function (node, idsToExclude) {
	var children = [];
	var self = this;
	node.childrenIds.forEach(function (childId) {
		if (!idsToExclude || idsToExclude.indexOf(childId) < 0) {
			var child = self.mapViewModel.getNodeById(childId);
			if (child)
				children.push(child);
		}
	});
	return children.sort(function (node1, node2) { return node1.order - node2.order; });
};

AbstractTreeMapBehavior.prototype.getParent = function (node) {
	return this.mapViewModel.getNodeById(node.parentId);
};
