define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/on",
    "esri/geometry/Extent",
],
    function (
        declare,
        lang,
        dom,
        domConstruct,
        domClass,
        on,
        Extent
    ) {
        return declare("", null, {
            initArea: function () {
                this.areaCSS = {
                    noteContainer: 'note-container',
                    noteItem: 'note-item',
                    noteContent: 'note-content',
                    notePadding: 'note-padding',
                    noteSelected: 'note-selected',
                    noteImage: 'note-image',
                    noteLink: 'note-link',
                    bookmarkItem: 'bookmark-item'
                };
                this._placeBookmarks();
                this._placeNotes();
            },
            _placeNotes: function(){
                this._notesLayers = this._getNotesLayers({
                    map: this.map,
                    layers: this.layers,
                    title: this.config.notes_layer_title,
                    id: this.config.notes_layer_id
                });
                if(this._notesLayers && this._notesLayers.length){
                    this._placeNoteItems();
                }
            },
            _placeNoteItems: function(){
                this.noteNodes = [];
                this.noteGraphics = [];
                this.noteGeometries = [];
                var count = 0;
                var notesNode = dom.byId('area_notes');
                for(var i = 0; i < this._notesLayers.length; i++){
                    for(var j = 0; j < this._notesLayers[i].graphics.length; j++){
                        var graphic = this._notesLayers[i].graphics[j];
                        var attributes = this._notesLayers[i].graphics[j].attributes;
                        var geometry = this._notesLayers[i].graphics[j].geometry;
                        this.noteGeometries.push(geometry);
                        this.noteGraphics.push(graphic);
                        // note container
                        var containerNode = domConstruct.create('div', {
                            className: this.areaCSS.noteContainer
                        });
                        // if first one, default open
                        if(count === 0){
                            domClass.add(containerNode, this.areaCSS.noteSelected);
                        }
                        // note title
                        var titleNode = domConstruct.create('div', {
                            innerHTML: attributes.TITLE,
                            className: this.areaCSS.noteItem
                        });
                        domConstruct.place(titleNode, containerNode, 'last');
                        // note HTML
                        var noteContent = '';
                        if (attributes.DESCRIPTION) {
                            noteContent = attributes.DESCRIPTION + "\n";
                        }
                        if (attributes.IMAGE_URL) {
                            if (attributes.IMAGE_LINK_URL) {
                                noteContent += '<a class="' + this.areaCSS.noteLink + '" target="_blank" href="' + attributes.IMAGE_LINK_URL + '"><image class="' + this.areaCSS.noteImage + '" src= "' + attributes.IMAGE_URL + '" alt="' + attributes.TITLE + '" /></a>';
                            }
                            else {
                                noteContent += '<image class="' + this.areaCSS.noteImage + '" src="' + attributes.IMAGE_URL + '" alt="' + attributes.TITLE + '" />';
                            }
                        }
                        if(!noteContent){
                            noteContent = this.config.i18n.area.notesUnavailable;
                        }
                        // note content
                        var contentNode = domConstruct.create('div', {  
                            className: this.areaCSS.noteContent,
                            innerHTML: '<div class="' + this.areaCSS.notePadding + '">' + noteContent + '</div>'
                        });
                        domConstruct.place(contentNode, containerNode, 'last');
                        // store nodes
                        this.noteNodes.push({
                            containerNode: containerNode,
                            titleNode: titleNode,
                            contentNode: contentNode
                        });
                        // note event
                        this._noteEvent(count);
                        // insert node
                        domConstruct.place(containerNode, notesNode, 'last');
                        // keep score!
                        count++;
                    }
                }  
            },
            // get layer
            _getNotesLayers: function (obj) {
                var mapLayer, mapLayers = [], layers, layer, i, j;
                // if we have a layer id
                if (obj.id) {
                    for (i = 0; i < obj.layers.length; i++) {
                        layer = obj.layers[i];
                        if (layer.id === obj.id) {
                            layers = layer.featureCollection.layers;
                            for(j = 0; j < layers.length; j++){
                                mapLayer = obj.map.getLayer(layers[j].id);
                                if(mapLayer){
                                    mapLayers.push(mapLayer);
                                }
                            }
                            return mapLayers;
                        }
                    }
                } else if (obj.title) {
                    // use layer title
                    for (i = 0; i < obj.layers.length; i++) {
                        layer = obj.layers[i];
                        if (layer.title.toLowerCase() === obj.title.toLowerCase()) {
                            layers = layer.featureCollection.layers;
                            for(j = 0; j < layers.length; j++){
                                mapLayer = obj.map.getLayer(layers[j].id);
                                if(mapLayer){
                                    mapLayers.push(mapLayer);
                                }
                            }
                            return mapLayers;
                        }
                    }
                }
                return false;
            },
            _noteEvent: function(idx){
                on(this.noteNodes[idx].titleNode, 'click', lang.hitch(this, function(){
                    // if note open
                    if(domClass.contains(this.noteNodes[idx].containerNode, this.areaCSS.noteSelected)){
                        // close note
                        domClass.toggle(this.noteNodes[idx].containerNode, this.areaCSS.noteSelected);    
                    }
                    else{
                        // close selected notes
                        for(var i = 0; i < this.noteNodes.length; i++){
                            domClass.remove(this.noteNodes[i].containerNode, this.areaCSS.noteSelected);
                        }
                        // open note
                        domClass.toggle(this.noteNodes[idx].containerNode, this.areaCSS.noteSelected);
                    }
                    var geometry = this.noteGeometries[idx];
                    var extent;
                    switch(geometry.type){
                        case "point":
                            extent = this.map.extent.centerAt(geometry);
                            break;
                        default:
                            extent = geometry.getExtent();
                    }
                    this.map.setExtent(extent, true).then(lang.hitch(this, function(){
                        // select graphic
                        if(this.map.infoWindow){
                            this.map.infoWindow.setFeatures([this.noteGraphics[idx]]);
                            this.map.infoWindow.show(extent.getCenter());
                        } 
                    }));
                });
            },
            _bookmarkEvent: function(idx){
                on(this.bmNodes[idx], 'click', lang.hitch(this, function(){
                    var extent = new Extent(this.bookmarks[idx].extent);
                    this.map.setExtent(extent);
                }));
            },
            _placeBookmarks: function(){
                var bookmarks = this.bookmarks;
                if (bookmarks && bookmarks.length){
                    var bookmarksNode = dom.byId('area_bookmarks');
                    this.bmNodes = [];
                    for(var i = 0; i < bookmarks.length; i++){
                        var node = domConstruct.create('div', {
                            innerHTML: bookmarks[i].name,
                            className: this.areaCSS.bookmarkItem
                        });
                        this.bmNodes.push(node);
                        this._bookmarkEvent(i);
                        domConstruct.place(node, bookmarksNode, 'last');
                    }
                }
            }
        });
    });