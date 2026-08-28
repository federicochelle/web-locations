import { LegalPageLayout } from '@/components/legal/LegalPageLayout.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function TermsPage() {
  usePageTitle('Términos y Condiciones')

  return (
    <LegalPageLayout title="Términos y Condiciones">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-brand-300">
          Términos y Condiciones de Uso — Film Locations UY
        </p>
        <p className="text-brand-100/64">Última actualización: agosto de 2026</p>
      </div>

      <p>
        Bienvenido a Film Locations UY, una plataforma destinada a facilitar la búsqueda, selección y gestión de locaciones para producciones audiovisuales, fotográficas, publicitarias y actividades relacionadas.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">1. Aceptación de los términos</h2>
        <p>
          Al registrarse, acceder o utilizar la Plataforma, el usuario acepta los presentes Términos y Condiciones y reconoce haber leído la Política de Privacidad.
        </p>
        <p>Si no está de acuerdo con estas condiciones, no deberá utilizar la Plataforma.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">2. La Plataforma</h2>
        <p>
          Film Locations UY ofrece un servicio de búsqueda, selección y gestión de locaciones, facilitando la conexión entre personas o empresas interesadas en utilizar una locación y sus propietarios, responsables, administradores u organismos competentes, según corresponda.
        </p>
        <p>
          La Plataforma actúa como intermediaria y no es propietaria de las locaciones incluidas en su catálogo.
        </p>
        <p>
          La publicación de una locación no constituye una oferta definitiva, reserva ni autorización para utilizarla.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">3. Usuarios</h2>
        <p>
          Los usuarios deberán proporcionar información verdadera, completa y actualizada cuando sea requerida.
        </p>
        <p>
          Cada usuario es responsable del uso de su cuenta y de mantener la confidencialidad de sus credenciales de acceso.
        </p>
        <p>
          La Plataforma podrá limitar, suspender o cancelar cuentas cuando detecte un uso fraudulento, abusivo, contrario a estos Términos o que pueda perjudicar a terceros o al funcionamiento del servicio.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">4. Locaciones privadas</h2>
        <p>
          La Plataforma podrá incluir propiedades, establecimientos y otros espacios de carácter privado incorporados al catálogo con conocimiento o consentimiento de sus propietarios, responsables o personas vinculadas a su gestión.
        </p>
        <p>
          La presencia de una locación privada en la Plataforma no significa que se encuentre disponible para cualquier fecha, actividad o producción.
        </p>
        <p>
          Toda solicitud estará sujeta a consulta y posterior confirmación con el propietario, responsable o persona correspondiente.
        </p>
        <p>
          Las condiciones particulares de utilización de cada locación podrán variar según las características de la producción, fechas, horarios, cantidad de personas, equipamiento y demás circunstancias relevantes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">5. Espacios públicos</h2>
        <p>
          La Plataforma podrá incluir calles, plazas, parques, peatonales y otros espacios públicos que puedan resultar de interés como locaciones.
        </p>
        <p>Estos espacios se incorporan al catálogo con fines de búsqueda, referencia y selección.</p>
        <p>
          Su inclusión en la Plataforma no implica que exista una autorización para realizar filmaciones, sesiones fotográficas, producciones u otras actividades en dichos espacios.
        </p>
        <p>
          Cuando corresponda, su utilización estará sujeta a los permisos, habilitaciones o autorizaciones exigidos por las autoridades, organismos o entidades competentes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">6. Solicitudes y disponibilidad</h2>
        <p>
          Los usuarios podrán seleccionar una o varias locaciones y enviar solicitudes relacionadas con un proyecto o producción.
        </p>
        <p>
          El envío de una solicitud no constituye una reserva ni garantiza la disponibilidad o autorización de las locaciones seleccionadas.
        </p>
        <p>
          La Plataforma podrá gestionar la solicitud con los propietarios, responsables, administradores u organismos correspondientes.
        </p>
        <p>
          Una locación únicamente se considerará confirmada cuando dicha confirmación haya sido expresamente comunicada al usuario por los medios establecidos para ello.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">7. Uso de las locaciones</h2>
        <p>
          El usuario deberá utilizar cualquier locación de acuerdo con las condiciones previamente acordadas y respetando las normas aplicables.
        </p>
        <p>
          Cuando corresponda, será necesario respetar horarios, cantidad de asistentes, actividades autorizadas, restricciones de acceso, condiciones de seguridad y cualquier otra condición establecida para la utilización de la locación.
        </p>
        <p>
          La confirmación de una locación no exime al usuario del cumplimiento de permisos, habilitaciones o requisitos legales que puedan corresponder según las características de la producción.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">8. Información, fotografías y contenido</h2>
        <p>
          La Plataforma procura que la información y las imágenes de las locaciones sean representativas y se encuentren actualizadas.
        </p>
        <p>
          Sin embargo, determinadas características de una locación pueden modificarse con el tiempo. Las fotografías, dimensiones, descripciones, equipamiento, entorno y demás información publicada deberán considerarse referencias de la locación al momento de su incorporación o actualización.
        </p>
        <p>
          La Plataforma podrá modificar, corregir, actualizar o retirar información y locaciones cuando lo considere necesario.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">9. Propiedad intelectual</h2>
        <p>
          El diseño, software, marca, estructura, textos, bases de datos, material gráfico y demás elementos propios de la Plataforma se encuentran protegidos por las normas de propiedad intelectual que correspondan.
        </p>
        <p>
          Las fotografías y demás contenidos correspondientes a las locaciones podrán pertenecer a sus respectivos autores, propietarios o titulares de derechos.
        </p>
        <p>
          El acceso a la Plataforma no concede al usuario autorización para copiar, reproducir, comercializar, redistribuir o utilizar dichos contenidos fuera de las finalidades propias del servicio, salvo autorización expresa de su titular.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">10. Usos prohibidos</h2>
        <p>No está permitido utilizar la Plataforma para fines ilegales, fraudulentos o contrarios a estos Términos.</p>
        <p>En particular, queda prohibido:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-brand-300">
          <li>proporcionar información falsa o hacerse pasar por otra persona o empresa;</li>
          <li>intentar acceder sin autorización a cuentas, sistemas o información de la Plataforma;</li>
          <li>realizar actividades que puedan afectar la seguridad o funcionamiento del servicio;</li>
          <li>
            extraer, copiar o recopilar de forma masiva información, imágenes o datos del catálogo sin autorización;
          </li>
          <li>
            utilizar información obtenida mediante la Plataforma para acosar, perjudicar o realizar actividades ilícitas contra terceros;
          </li>
          <li>
            utilizar las fotografías, información o contenidos de las locaciones de manera no autorizada.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">11. Responsabilidad</h2>
        <p>
          La Plataforma facilita la búsqueda y gestión de locaciones, pero no puede garantizar que una locación determinada se encuentre disponible, sea finalmente autorizada o resulte adecuada para todas las necesidades particulares de una producción.
        </p>
        <p>
          Los propietarios, responsables, organismos y usuarios conservan las responsabilidades que les correspondan respecto de sus propias actuaciones y obligaciones.
        </p>
        <p>
          La Plataforma tampoco será responsable por interrupciones temporales ocasionadas por mantenimiento, problemas técnicos, servicios de terceros o situaciones razonablemente fuera de su control, sin perjuicio de las responsabilidades que legalmente correspondan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">12. Servicios de terceros</h2>
        <p>
          Para su funcionamiento, la Plataforma podrá utilizar servicios tecnológicos proporcionados por terceros, incluyendo servicios de alojamiento, almacenamiento, autenticación, procesamiento de pagos, comunicaciones, mapas, búsqueda y otras herramientas necesarias para prestar el servicio.
        </p>
        <p>
          La utilización de dichos servicios podrá estar sujeta a las condiciones y políticas propias de sus respectivos proveedores.
        </p>
        <p>
          El tratamiento de datos personales asociado a estos servicios se encuentra desarrollado en la Política de Privacidad de la Plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">13. Suspensión o finalización del servicio</h2>
        <p>
          La Plataforma podrá suspender temporalmente determinadas funcionalidades por razones técnicas, de mantenimiento, seguridad o actualización.
        </p>
        <p>
          Asimismo, podrá restringir o finalizar el acceso de usuarios que incumplan estos Términos, realicen actividades fraudulentas o utilicen el servicio de forma que pueda perjudicar a la Plataforma, a otros usuarios o a terceros.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">14. Modificaciones</h2>
        <p>
          Estos Términos y Condiciones podrán actualizarse cuando existan cambios en el funcionamiento de la Plataforma, sus servicios o la normativa aplicable.
        </p>
        <p>La versión vigente será la publicada en la Plataforma.</p>
        <p>
          Cuando se realicen modificaciones relevantes que requieran una nueva aceptación, los usuarios podrán ser informados y se les podrá solicitar que acepten la nueva versión para continuar utilizando determinadas funcionalidades.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">15. Legislación aplicable</h2>
        <p>Estos Términos y Condiciones se regirán por la legislación de la República Oriental del Uruguay.</p>
        <p>
          La aplicación de estos Términos se realizará sin perjuicio de los derechos y garantías que correspondan a los usuarios conforme a la normativa vigente.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">16. Contacto</h2>
        <p>
          Por consultas relacionadas con estos Términos y Condiciones o con el funcionamiento de la Plataforma, los usuarios podrán comunicarse a:
        </p>
        <p>
          Film Locations UY
          <br />
          Correo electrónico: locationsfilm51@gmail.com
          <br />
          Uruguay
        </p>
      </section>

      <p>
        Al utilizar la Plataforma, el usuario declara haber leído y comprendido estos Términos y Condiciones.
      </p>
    </LegalPageLayout>
  )
}
