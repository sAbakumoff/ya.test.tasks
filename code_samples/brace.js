var BraceAction = {
	'addPart': 1,
	'addWhole': 2
};

var BraceMapBehavior = function (mapViewModel) {
	var configuration = {
		configureRootNode: configureBraceMapRootNode,
		layout: braceMapLayout,
		Action: BraceAction,
		onDragOver: braceMapDragOver,
		onDrop: braceOnDrop,
		buildParentChildConnectionModifications: function (child, parent, modificationsList) {
			buildListModification(parent, modificationsList, 'childrenIds', child.id);
			buildPropertyModification(child, 'parentId', parent.id, modificationsList);
		},
		handleModifications: braceHandleModifications
	};
	return new AbstractTreeMapBehavior(mapViewModel, configuration);
};

function braceHandleModifications(modificationsList) {
	var self = this;
	this.nodes().forEach(function (node) {
		if (self.isMapNode(node)) {
			var nodeProps = getModifiedProperties(node, modificationsList);
			if (nodeProps.childrenIds && nodeProps.childrenIds.length === 0 && !node.isRoot) {
				buildPropertyModification(node, 'connections', [], modificationsList);
			}
		}
	});
}

function configureBraceMapRootNode(rootNode) {
	rootNode.connections = [{ target: rootNode.id, type: 'brace' }];
	//rootNode.properties.Fill.property('red');
}


function braceMapLayout(nodesInfo, currentNodeInfo, maxBreadth, maxDepth) {
	function updateLocation(node, x, y) {
		node.x = x;
		node.y = y;
		node.originalLocationChanged = true;
	}
	var distanceBetweenNodes = 30;
	updateLocation(currentNodeInfo, maxBreadth, maxDepth);
	if (currentNodeInfo.childrenIds.length === 0)
		return;
	var childrenInfo = this.getChildrenNodeInfo(nodesInfo, currentNodeInfo);
	var previousSibling = null;
	var self = this;
	var breadth = maxBreadth + currentNodeInfo.width + distanceBetweenNodes, depth = maxDepth;
	childrenInfo.forEach(function (childInfo) {		
		if (previousSibling != null) {
			var maxY = self.getMaxDepth(nodesInfo, previousSibling);
			depth = maxY + distanceBetweenNodes;
		}
		braceMapLayout.call(self, nodesInfo, childInfo, breadth, depth);
		previousSibling = childInfo;
	});
	var firstChild = childrenInfo[0];
	var lastChild = childrenInfo[childrenInfo.length - 1];
	var span = lastChild.y + lastChild.height - firstChild.y;
	var factor = childrenInfo.length === 1 ? currentNodeInfo.height / 2 : currentNodeInfo.height;
	updateLocation(currentNodeInfo, maxBreadth, firstChild.y + span / 2 - factor);
};

function braceMapDragOver(mapPoint, draggedNode) {
	var self = this;
	this.dropAction = null;
	var isReorder = this.isMapNode(draggedNode);
	var closestElem = this.mapViewModel.getClosestNodeOfType(mapPoint, 'treeNode');
	if (closestElem && isReorder && this.mapViewModel.getNodeById(closestElem.id, draggedNode.getGluedObjects())) {
		closestElem = null;
	}
	if (closestElem) {
		var closestBox = closestElem.bBox();
		var halfWidth = (closestBox.x2 - closestBox.x) / 2;
		this.dropAction = {
			parent: closestElem
		};
		var customHighlightZone = {
			type: 'path',
			attr: self.mapViewModel.dropTargetHighlightAttr
		};
		if (closestElem.isRoot)
			actionsList = [
				{
					bounds: {
						x: closestBox.x,
						x2: closestBox.x2,
						y: closestBox.y,
						y2: closestBox.y2
					},
					action:BraceAction.addPart
				}					
			];
		else 
			var actionsList = [
			{
				bounds: {
					x: closestBox.x,
					x2: closestBox.x + halfWidth,
					y: closestBox.y,
					y2: closestBox.y2
				},
				action:BraceAction.addWhole
			},
			{
				bounds: {
					x: closestBox.x + halfWidth,
					x2: closestBox.x2,
					y: closestBox.y,
					y2: closestBox.y2
				},
				action:BraceAction.addPart
			}
		];
		actionsList.forEach(function (ac) {
			if (mapPoint.x >= ac.bounds.x && mapPoint.x <= ac.bounds.x2) {
				customHighlightZone.path = getRectanglePath(ac.bounds);
				self.dropAction.action = ac.action;
			}
		});
		return {
			customHighlightZones: [customHighlightZone]
		};
	}
	return isReorder ? {} : null;
}

function braceOnDrop(droppedItem, serviceProvider, fallback) {
	var map = this.mapViewModel;
	var droppedItemInMap = map.getNodeById(droppedItem.id) !== null;
	var reOrdering = droppedItemInMap && this.isMapNode(droppedItem);
	if (!this.dropAction) {
		if(reOrdering)
			map.resetNodeLocation(droppedItem);
		if (isFunction(fallback))
			fallback();
		return;
	}
	var parentNode = this.dropAction.parent;
	if (reOrdering) {
		newNode = droppedItem;
	} else {
		var newNode = new TreeNodeViewModel(droppedItem);
		newNode.id = getObjectId();
		newNode.parentId = null;
		newNode.setParentMap(map);
		if (!droppedItemInMap)
			newNode.properties.Text.property('Part');
	}
	if (this.dropAction && this.dropAction.action == BraceAction.addPart) {
		var modifications = braceModificationsForPartInsertion.call(this, newNode, parentNode);
	}
	else if (this.dropAction && this.dropAction.action == BraceAction.addWhole) {
		modifications = braceModificationsForWholeInsertion.call(this, newNode, parentNode);
	}
	braceHandleModifications.call(this, modifications);
	if (reOrdering) {
		map.modifyNodes(modifications);
	} else {
		var nodesToRemove = droppedItemInMap ? [droppedItem] : [];
		var mapModifications = droppedItemInMap ? [] : [map.getInPlaceEditorModification(newNode)];
		map.addRemoveNodes([newNode], nodesToRemove, modifications, mapModifications);
	}
	this.dropAction = null;
};

function braceModificationsForWholeInsertion(node, parentNode) {
	var modificationsList = [];
	buildPropertyModification(node, 'connections', [{ target: node.id, type: 'brace' }], modificationsList);
	var existingParent = this.getParent(node);
	if (existingParent) {
		buildRemovingChildModification(node, existingParent, modificationsList);
	}
	var parentOfParent = this.getParent(parentNode);
	if (parentOfParent) {
		buildRemovingChildModification(parentNode, parentOfParent, modificationsList);
		buildListModification(parentOfParent, modificationsList, 'childrenIds', node.id);
		buildPropertyModification(node, 'parentId', parentOfParent.id, modificationsList);
	} else {
		buildPropertyModification(node, 'parentId', null, modificationsList);
	}
	buildPropertyModification(node, 'order', parentNode.order, modificationsList);

	buildListModification(node, modificationsList, 'childrenIds', parentNode.id);
	buildPropertyModification(parentNode, 'parentId', node.id, modificationsList);
	buildPropertyModification(parentNode, 'order', this.getNewChildOrder(parentNode, node), modificationsList);
	return modificationsList;
}

function braceModificationsForPartInsertion(node, parentNode, reOrdering) {
	var modificationsList = [];
	if (parentNode.connections.length === 0) {
		buildPropertyModification(parentNode, 'connections', [{ target: parentNode.id, type: 'brace' }], modificationsList);
	}
	var existingParent = this.getParent(node);
	if (existingParent) {
		buildRemovingChildModification(node, existingParent, modificationsList);
	}
	buildListModification(parentNode, modificationsList, 'childrenIds', node.id);
	buildPropertyModification(node, 'parentId', parentNode.id, modificationsList);
	var nodeOrder = this.getNewChildOrder(node, parentNode);
	buildPropertyModification(node, 'order', nodeOrder, modificationsList);
	return modificationsList;
}