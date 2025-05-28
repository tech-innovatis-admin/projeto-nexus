import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Draw {
    class Event {
      static readonly CREATED: 'draw:created';
      static readonly EDITED: 'draw:edited';
      static readonly DELETED: 'draw:deleted';
      static readonly DRAWSTART: 'draw:drawstart';
      static readonly DRAWSTOP: 'draw:drawstop';
      static readonly DRAWVERTEX: 'draw:drawvertex';
      static readonly EDITSTART: 'draw:editstart';
      static readonly EDITMOVE: 'draw:editmove';
      static readonly EDITRESIZE: 'draw:editresize';
      static readonly EDITVERTEX: 'draw:editvertex';
      static readonly EDITSTOP: 'draw:editstop';
      static readonly DELETESTART: 'draw:deletestart';
      static readonly DELETESTOP: 'draw:deletestop';
    }

    interface DrawOptions {
      position?: string;
      draw?: {
        polyline?: boolean | any;
        polygon?: boolean | any;
        rectangle?: boolean | any;
        circle?: boolean | any;
        marker?: boolean | any;
        circlemarker?: boolean | any;
      };
      edit?: {
        featureGroup: L.FeatureGroup;
        remove?: boolean;
        edit?: boolean;
      };
    }

    class Control extends L.Control {
      constructor(options?: DrawOptions);
    }
  }

  interface Map {
    addControl(control: Control.Draw): this;
    on(type: typeof Draw.Event.CREATED, fn: (e: { layer: Layer }) => void): this;
  }

  namespace Control {
    class Draw extends L.Control {
      constructor(options?: Draw.DrawOptions);
    }
  }

  namespace control {
    function draw(options?: Draw.DrawOptions): Control.Draw;
    function layers(
      baseLayers?: { [name: string]: Layer },
      overlays?: { [name: string]: Layer },
      options?: LayersOptions
    ): Control.Layers;
  }

  interface LayersOptions {
    collapsed?: boolean;
    position?: string;
  }
} 