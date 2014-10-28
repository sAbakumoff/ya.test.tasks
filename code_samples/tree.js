var TreeMapAction = {
	'addNode': 1
};

var TreeMapBehavior = function (mapViewModel) {	
	var configuration = {
		layout: treeMapLayout,
		Action: TreeMapAction,
		onDragOver: treeMapDragOver,
		onDrop: treeMapOnDrop,
		buildParentChildConnectionModifications: function (child, parent, modificationsList) {
			buildConnectionModification(child, parent, modificationsList);
		}
	};
	return new AbstractTreeMapBehavior(mapViewModel, configuration);

};

function treeMapDragOver(mapPoint, draggedNode) {
	var self = this;
	self.dropAction = null;
	var closestElem = self.mapViewModel.getClosestNodeOfType(mapPoint, 'treeNode');
	var reOrdering = this.isMapNode(draggedNode);
	if (closestElem && reOrdering &&
		this.mapViewModel.getNodeById(closestElem.id, draggedNode.getGluedObjects())) {
		closestElem = null;
	}
	if (closestElem) {
		var children = this.getChildren(closestElem);
		var hasChildren = children && children.length;
		self.dropAction = {
			action: TreeMapAction.addNode,
			parent: closestElem
		};
		var closestBox = closestElem.bBox();
		var customHighlightZone = {
			type: 'path',
			attr: self.mapViewModel.dropTargetHighlightAttr,
			path: getRectanglePath(closestBox)
		};
		var defaultRes = {
			activeElemPath: null,
			customHighlightZones: [customHighlightZone]
		};
		if (this.isMapNode(draggedNode)) {
			if (draggedNode.isDetail) {
				var directParent = hasChildren && children[0].id === draggedNode.id;
				if (closestElem.isDetail) {
					allowed = !self.mapViewModel.getNodeById(closestElem.parentId).isDetail && (!hasChildren || !directParent);
				} else {
					var allowed = (!hasChildren && !closestElem.isRoot) || (!directParent);
				}
			}
			else {
				allowed = closestElem.isRoot ||
					(!closestElem.isDetail && !hasChildren) || (hasChildren && !children[0].isDetail);
			}
			if (allowed) {
				return defaultRes;
			} else {
				this.dropAction = null;
				return null;
			}
		}
		if (closestElem.isRoot || closestElem.isDetail) {
			self.dropAction.isDetail = closestElem.isDetail;
		}
		else if(hasChildren) {
			self.dropAction.isDetail = children[0].isDetail;
		}
		else {
			var halfHeight = (closestBox.y2 - closestBox.y) / 2;
			var actionsList = [
				{
					bounds: {
						x: closestBox.x,
						y: closestBox.y,
						x2: closestBox.x2,
						y2: closestBox.y + halfHeight
					},
					isDetail: false
				},
				{
					bounds: {
						x: closestBox.x,
						y: closestBox.y + halfHeight,
						x2: closestBox.x2,
						y2: closestBox.y2
					},
					isDetail: true
				}
			];
			actionsList.forEach(function (ac) {
				if (mapPoint.y >= ac.bounds.y && mapPoint.y <= ac.bounds.y2) {
					customHighlightZone.path = getRectanglePath(ac.bounds);
					self.dropAction.isDetail = ac.isDetail;
				}
			});
		}
		return defaultRes;
	}
	return reOrdering ? {} : null;
};

function treeMapOnDrop(droppedItem, serviceProvider, fallback) {
	var map = this.mapViewModel;
	var droppedItemInMap = map.getNodeById(droppedItem.id) !== null;
	var reOrdering = droppedItemInMap && this.isMapNode(droppedItem);
	if (!this.dropAction) {
		if (reOrdering)
			map.resetNodeLocation(droppedItem);
		if (isFunction(fallback))
			fallback();
		return;
	}
	if (this.dropAction && this.dropAction.action == TreeMapAction.addNode) {
		var newNode = droppedItem;
		var parentNode = this.dropAction.parent;
		if (!reOrdering) {
			newNode = new TreeNodeViewModel(droppedItem);
			newNode.id = getObjectId();
			newNode.parentId = null;
			newNode.isDetail = this.dropAction.isDetail;
			newNode.setParentMap(map);
			if (!droppedItemInMap)
				newNode.properties.Text.property(newNode.isDetail ? 'Detail' : 'Subcategory');
		}
		var insertionModifications = getTreeMapModificationsForNodeInsertion.call(this, newNode, parentNode, reOrdering);
		if (reOrdering) {
			map.modifyNodes(insertionModifications);
		}
		else {
			var nodesToRemove = droppedItemInMap ? [droppedItem] : [];
			var mapModifications = droppedItemInMap ? [] : [map.getInPlaceEditorModification(newNode)];
			map.addRemoveNodes([newNode], nodesToRemove, insertionModifications, mapModifications);
		}
		this.dropAction = null;
	}
};

function treeMapLayout(nodesInfo, currentNodeInfo, maxBreadth, maxDepth) {
	function updateLocation(nodeInfo, breadth, depth) {
		nodeInfo.x = breadth - nodeInfo.width / 2;
		nodeInfo.y = depth - nodeInfo.height;
		nodeInfo.originalLocationChanged = true;
	};
	updateLocation(currentNodeInfo, maxBreadth, maxDepth);
	if (currentNodeInfo.childrenIds.length === 0)
		return;
	var childrenInfo = this.getChildrenNodeInfo(nodesInfo, currentNodeInfo);
	var previousSibling = null;
	var self = this;
	childrenInfo.forEach(function (childInfo) {
		var verticalDistance = (currentNodeInfo.isDetail && childInfo.isDetail) ? 0 : 30;
		var breadth = maxBreadth, depth = maxDepth + verticalDistance + childInfo.height;
		if (previousSibling != null) {
			var maxX = self.getMaxBreadth(nodesInfo, previousSibling);
			breadth = maxX + 30 + childInfo.width / 2;
		}
		treeMapLayout.call(self, nodesInfo, childInfo, breadth, depth);
		previousSibling = childInfo;
	});
	var firstChild = childrenInfo[0];
	var lastChild = childrenInfo[childrenInfo.length - 1];
	var span = lastChild.x + lastChild.width - firstChild.x;
	updateLocation(currentNodeInfo, firstChild.x + span / 2, maxDepth);
};

function getTreeMapModificationsForNodeInsertion(node, parent, reOrdering) {
	var self = this;
	function getDetailNode(nodeToInspect) {
		var detailNode = null;
		if (!nodeToInspect)
			return null;
		var childrenNodes = self.getChildren(nodeToInspect);
		childrenNodes.forEach(function (child) {
			if (child.isDetail)
				detailNode = child;
		});
		return detailNode;
	}
	function getLastDetailNode(detailNode) {
		var childrenNodes = self.getChildren(detailNode);
		var lastNode = detailNode;
		while (childrenNodes && childrenNodes.length) {
			lastNode = childrenNodes[0];
			childrenNodes = self.getChildren(lastNode);
		}
		return lastNode;
	}
	var modificationsList = [];
	var existingParent = self.getParent(node);
	if (existingParent === parent) {
		if (!node.isDetail) {
			var childNodes = this.getChildren(parent, [node.id]);
			var order = childNodes && childNodes.length ? childNodes[childNodes.length - 1].order + 1 : 1;
			buildPropertyModification(node, 'order', order, modificationsList);
		}
		return modificationsList;
	}
	if(existingParent) {
		buildRemovingChildModification(node, existingParent, modificationsList);
	}
	if (parent) {
		buildConnectionModification(node, parent, modificationsList);
	}
	var nodeOrder = 1;
	var children = this.getChildren(node);
	if (children.length == 0 || reOrdering) {
		if (parent) {
			children = this.getChildren(parent, [node.id]);
			var oldLastChild = children && children.length ? children[children.length - 1] : null;
			if (oldLastChild) {
				nodeOrder = oldLastChild.order + 1;
			}
		}
	} else {
		nodeOrder = children[0].order;
		var oldParent = this.getParent(children[0]);
		var modChildren = oldParent.childrenIds.slice();
		children.forEach(function (child) {
			buildPropertyModification(child, 'parentId', node.id, modificationsList);
			var index = modChildren.indexOf(child.id);
			if (index >= 0)
				modChildren.splice(index, 1);
			buildConnectionModification(child, node, modificationsList);
		});
		buildPropertyModification(oldParent, 'childrenIds', modChildren, modificationsList);
	}
	
	if (node.isDetail) {
		var detail = getDetailNode(parent);
		if (detail) {
			buildRemovingChildModification(detail, parent, modificationsList);
			nodeOrder = detail.order;
			buildConnectionModification(detail, getLastDetailNode(node), modificationsList);
		}
	}
	buildPropertyModification(node, 'order', nodeOrder, modificationsList);
	return modificationsList;
};